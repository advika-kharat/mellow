import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ---------------------------------------------------------
    // Get the core listening statistics in parallel
    // ---------------------------------------------------------

    const [
      totalsResult,
      nightResult,
      repeatResult,
      weekendResult,
      artistResult,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_plays,
          COUNT(DISTINCT artist)::int AS unique_artists,
          COUNT(DISTINCT track)::int AS unique_tracks
        FROM listening_plays
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS late_night_plays,
          COUNT(*) FILTER (
            WHERE local_hour >= 22
               OR local_hour < 6
          )::int AS night_plays
        FROM listening_plays
      `),

      pool.query(`
        SELECT
          track,
          artist,
          COUNT(*)::int AS plays,
          COUNT(
            DISTINCT DATE(
              played_at AT TIME ZONE 'Asia/Kolkata'
            )
          )::int AS distinct_days
        FROM listening_plays
        GROUP BY track, artist
        HAVING COUNT(
          DISTINCT DATE(
            played_at AT TIME ZONE 'Asia/Kolkata'
          )
        ) >= 2
        ORDER BY distinct_days DESC, plays DESC
        LIMIT 5
      `),

      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE is_weekend = true
          )::int AS weekend_plays,
          COUNT(*) FILTER (
            WHERE is_weekend = false
          )::int AS weekday_plays
        FROM listening_plays
      `),

      pool.query(`
        SELECT
          artist,
          COUNT(*)::int AS plays,
          COUNT(DISTINCT track)::int AS distinct_tracks,
          COUNT(
            DISTINCT DATE(
              played_at AT TIME ZONE 'Asia/Kolkata'
            )
          )::int AS distinct_days,
          COUNT(*) FILTER (
            WHERE listening_context = 'late night'
          )::int AS late_night_plays
        FROM listening_plays
        GROUP BY artist
        ORDER BY plays DESC
        LIMIT 5
      `),
    ]);

    const totals = totalsResult.rows[0];
    const night = nightResult.rows[0];
    const weekend = weekendResult.rows[0];

    const totalPlays = Number(totals.total_plays);

    if (totalPlays === 0) {
      return NextResponse.json({
        patterns: [],
      });
    }

    const patterns: Array<{
      type: string;
      title: string;
      description: string;
      stat?: string;
      detail?: string;
    }> = [];

    // ---------------------------------------------------------
    // 1. NIGHT OWL
    // ---------------------------------------------------------

    const nightPlays = Number(night.night_plays);

    const nightPercentage =
      totalPlays > 0 ? Math.round((nightPlays / totalPlays) * 100) : 0;

    if (nightPercentage >= 20) {
      const topNightArtist = artistResult.rows
        .slice()
        .sort(
          (a, b) => Number(b.late_night_plays) - Number(a.late_night_plays)
        )[0];

      patterns.push({
        type: "Timing",
        title: "THE NIGHT OWL",
        description:
          "Your listening activity spikes after dark. Apparently your soundtrack has office hours and they end at 10 PM.",
        stat: `${nightPercentage}% of your listening is late night`,
        detail: topNightArtist
          ? `${topNightArtist.artist} appears most often in your late-night listening.`
          : undefined,
      });
    }

    // ---------------------------------------------------------
    // 2. REPEAT OFFENDER
    // ---------------------------------------------------------

    const repeatedTracks = repeatResult.rows;

    if (repeatedTracks.length > 0) {
      const strongestRepeat = repeatedTracks[0];

      patterns.push({
        type: "Repetition",
        title: "THE REPEAT OFFENDER",
        description:
          "You don't just discover songs. You move them into the permanent residency program.",
        stat: `"${strongestRepeat.track}" — ${strongestRepeat.plays} plays`,
        detail: `You've returned to it across ${strongestRepeat.distinct_days} different days.`,
      });
    }

    // ---------------------------------------------------------
    // 3. WEEKEND ALTER EGO
    // ---------------------------------------------------------

    const weekendPlays = Number(weekend.weekend_plays);

    const weekdayPlays = Number(weekend.weekday_plays);

    const weekendPercentage =
      totalPlays > 0 ? Math.round((weekendPlays / totalPlays) * 100) : 0;

    if (weekendPercentage >= 30) {
      patterns.push({
        type: "Weekend",
        title: "THE WEEKEND ALTER EGO",
        description:
          "A suspicious amount of your listening happens on weekends. Your Saturday playlist clearly has different management.",
        stat: `${weekendPercentage}% of your plays happen on weekends`,
        detail:
          weekdayPlays > 0
            ? `${weekendPlays} weekend plays vs ${weekdayPlays} weekday plays.`
            : undefined,
      });
    }

    // ---------------------------------------------------------
    // 4. ARTIST OBSESSION
    // ---------------------------------------------------------

    if (artistResult.rows.length > 0) {
      const topArtist = artistResult.rows[0];

      const artistPercentage =
        totalPlays > 0
          ? Math.round((Number(topArtist.plays) / totalPlays) * 100)
          : 0;

      if (artistPercentage >= 10) {
        patterns.push({
          type: "Artist",
          title: "THE OBSESSION",
          description:
            "One artist has managed to occupy a suspiciously large amount of your listening history.",
          stat: `${artistPercentage}% of your plays are ${topArtist.artist}`,
          detail: `${topArtist.plays} plays across ${topArtist.distinct_tracks} different tracks.`,
        });
      }
    }

    // ---------------------------------------------------------
    // 5. REPEAT LISTENER
    // ---------------------------------------------------------

    const multiDayTracks = repeatedTracks.length;

    if (multiDayTracks >= 3) {
      patterns.push({
        type: "Habit",
        title: "YOU ADOPT SONGS",
        description:
          "You have several tracks that survive beyond a single listening session. Once a song gets in, apparently it's not leaving.",
        stat: `${multiDayTracks} songs survived multiple days`,
        detail:
          "These are the tracks you repeatedly come back to instead of immediately moving on.",
      });
    }

    // ---------------------------------------------------------
    // Return at most 5 patterns
    // ---------------------------------------------------------

    return NextResponse.json({
      patterns: patterns.slice(0, 5),

      summary: {
        totalPlays,
        uniqueArtists: Number(totals.unique_artists),
        uniqueTracks: Number(totals.unique_tracks),
      },
    });
  } catch (error) {
    console.error("Patterns API error:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze listening patterns",
      },
      { status: 500 }
    );
  }
}
