import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await pool.query(`
      SELECT
        lp.id,
        lp.track,
        lp.artist,
        lp.album,
        lp.played_at
      FROM listening_plays lp
      LEFT JOIN listening_embeddings le
        ON le.listening_play_id = lp.id
      WHERE le.id IS NULL
      ORDER BY lp.played_at ASC
    `);

    const accountResult = await pool.query(`
      SELECT timezone
      FROM spotify_accounts
      LIMIT 1
    `);

    const timezone = accountResult.rows[0]?.timezone ?? "UTC";

    let generated = 0;

    for (const play of result.rows) {
      const playedAt = new Date(play.played_at);

      const localParts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(playedAt);

      const getPart = (type: string) =>
        localParts.find((part) => part.type === type)?.value ?? "";

      const weekday = getPart("weekday");
      const hour = Number(getPart("hour"));
      const minute = getPart("minute");

      const isWeekend = weekday === "Saturday" || weekday === "Sunday";

      let context: string;

      if (hour >= 22 || hour < 6) {
        context = "late night";
      } else if (hour >= 6 && hour < 12) {
        context = "morning";
      } else if (hour >= 12 && hour < 18) {
        context = "afternoon";
      } else {
        context = "evening";
      }

      const localTime = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;

      const content = `
Track: ${play.track}
Artist: ${play.artist}
Album: ${play.album}
Local listening time: ${localTime}
Day: ${weekday}
Listening context: ${context}
      `.trim();

      await pool.query(
        `
        UPDATE listening_plays
        SET
          local_hour = $1,
          local_weekday = $2,
          is_weekend = $3,
          listening_context = $4
        WHERE id = $5
        `,
        [hour, weekday, isWeekend, context, play.id]
      );

      const embedding = await generateEmbedding(content);

      await pool.query(
        `
        INSERT INTO listening_embeddings
          (listening_play_id, content, embedding)
        VALUES
          ($1, $2, $3)
        ON CONFLICT (listening_play_id)
        DO NOTHING
        `,
        [play.id, content, `[${embedding.join(",")}]`]
      );

      generated++;
    }

    return NextResponse.json({
      success: true,
      generated,
      remaining: result.rows.length - generated,
      timezone,
    });
  } catch (error) {
    console.error("Embedding generation error:", error);

    return NextResponse.json(
      { error: "Failed to generate embeddings" },
      { status: 500 }
    );
  }
}
