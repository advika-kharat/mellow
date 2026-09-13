import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

type RoastArtist = {
  name: string;
  plays: number;
  distinctDays: number;
  lateNightPlays: number;
  weekendPlays: number;
  image: string | null;
};

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

  try {
    // ---------------------------------------------------------
    // 1. FETCH THE SMALL AMOUNT OF DATA WE ACTUALLY NEED
    // ---------------------------------------------------------

    const [artistResult, trackResult, overallResult] = await Promise.all([
      pool.query(`
          SELECT
            artist,
            COUNT(*)::int AS plays,
            COUNT(
              DISTINCT DATE(
                played_at AT TIME ZONE 'Asia/Kolkata'
              )
            )::int AS distinct_days,
            COUNT(*) FILTER (
              WHERE listening_context = 'late night'
            )::int AS late_night_plays,
            COUNT(*) FILTER (
              WHERE is_weekend = true
            )::int AS weekend_plays
          FROM listening_plays
          GROUP BY artist
          ORDER BY plays DESC, distinct_days DESC
          LIMIT 5
        `),

      pool.query(`
          SELECT
            track,
            artist,
            COUNT(*)::int AS plays
          FROM listening_plays
          GROUP BY track, artist
          ORDER BY plays DESC
          LIMIT 5
        `),

      pool.query(`
          SELECT
            COUNT(*)::int AS total_plays,
            COUNT(DISTINCT artist)::int AS unique_artists,
            COUNT(DISTINCT track)::int AS unique_tracks,
            COUNT(*) FILTER (
              WHERE listening_context = 'late night'
            )::int AS late_night_plays,
            COUNT(*) FILTER (
              WHERE is_weekend = true
            )::int AS weekend_plays
          FROM listening_plays
        `),
    ]);

    const overall = overallResult.rows[0];

    if (!overall || Number(overall.total_plays) === 0) {
      return NextResponse.json(
        { error: "Not enough listening data" },
        { status: 404 }
      );
    }

    const artists: RoastArtist[] = artistResult.rows.map((row: any) => ({
      name: row.artist,
      plays: Number(row.plays),
      distinctDays: Number(row.distinct_days),
      lateNightPlays: Number(row.late_night_plays),
      weekendPlays: Number(row.weekend_plays),
      image: null,
    }));

    const tracks = trackResult.rows.map((row: any) => ({
      track: row.track,
      artist: row.artist,
      plays: Number(row.plays),
    }));

    const totalPlays = Number(overall.total_plays);
    const uniqueArtists = Number(overall.unique_artists);
    const uniqueTracks = Number(overall.unique_tracks);
    const lateNightPlays = Number(overall.late_night_plays);
    const weekendPlays = Number(overall.weekend_plays);

    const lateNightPercentage =
      totalPlays > 0 ? Math.round((lateNightPlays / totalPlays) * 100) : 0;

    const weekendPercentage =
      totalPlays > 0 ? Math.round((weekendPlays / totalPlays) * 100) : 0;

    // ---------------------------------------------------------
    // 2. FETCH ARTIST IMAGES
    //
    // This is independent of the AI generation.
    // It gets only 20 Spotify artists and has a hard timeout.
    // ---------------------------------------------------------

    try {
      const spotifyResponse = await fetch(
        "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(3000),
        }
      );

      if (spotifyResponse.ok) {
        const spotifyData = await spotifyResponse.json();

        const imageMap = new Map<string, string>();

        for (const artist of spotifyData.items ?? []) {
          const image = artist.images?.[0]?.url;

          if (artist.name && image) {
            imageMap.set(artist.name, image);
          }
        }

        for (const artist of artists) {
          artist.image = imageMap.get(artist.name) ?? null;
        }
      }
    } catch (error) {
      console.warn("Spotify artist images unavailable:", error);
    }

    // ---------------------------------------------------------
    // 3. BUILD A VERY SMALL PROMPT
    //
    // IMPORTANT:
    // Do not send the entire database/profile to Gemma.
    // Only send facts that can actually be used in the roast.
    // ---------------------------------------------------------

    const topArtistText = artists
      .map(
        (artist, index) =>
          `${index + 1}. ${artist.name} — ${artist.plays} plays`
      )
      .join("\n");

    const topTrackText = tracks
      .map(
        (track, index) =>
          `${index + 1}. "${track.track}" — ${track.artist} (${track.plays} plays)`
      )
      .join("\n");

    const prompt = `Roast this Spotify history like a savage internet friend.

TOP ARTISTS:
${topArtistText}

TOP TRACKS:
${topTrackText}

TOTAL PLAYS: ${totalPlays}
UNIQUE ARTISTS: ${uniqueArtists}
UNIQUE TRACKS: ${uniqueTracks}
LATE-NIGHT PLAYS: ${lateNightPercentage}%
WEEKEND PLAYS: ${weekendPercentage}%

Write EXACTLY 3 short savage sentences.

Be chaotic, specific and funny.
Profanity is allowed.
Use the actual names above.
Mock repetition and weird combinations.
Use late-night/weekend behavior only when the numbers support it.
Do not compliment.
Do not give advice.
Do not invent facts.
Do not infer anything about the person's mental health, relationships, sexuality, appearance, religion, race or finances.

Return ONLY the 3 sentences.`;

    // ---------------------------------------------------------
    // 4. OLLAMA
    // ---------------------------------------------------------

    let ollamaResponse: Response;

    try {
      ollamaResponse = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
        },

        body: JSON.stringify({
          model: `${process.env.OLLAMA_MODEL}`,
          prompt,
          stream: false,

          options: {
            temperature: 0.85,
            top_p: 0.9,

            // Three short sentences.
            // 55 tokens is enough and keeps generation fast.
            num_predict: 55,
          },
        }),

        // We want the roast to feel instant.
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      console.error("Ollama request failed:", error);

      return NextResponse.json(
        {
          error: "AI roast generation timed out. Make sure Ollama is running.",
        },
        { status: 504 }
      );
    }

    if (!ollamaResponse.ok) {
      const error = await ollamaResponse.text();

      console.error("Ollama error:", error);

      return NextResponse.json(
        {
          error: "Failed to generate roast",
        },
        { status: 502 }
      );
    }

    const ollamaData = await ollamaResponse.json();

    const roastText = String(ollamaData.response ?? "")
      .trim()
      .replace(/^["']|["']$/g, "");

    console.log("Ollama roast:", roastText);

    if (!roastText) {
      return NextResponse.json(
        {
          error: "Ollama returned an empty roast",
        },
        { status: 502 }
      );
    }

    // ---------------------------------------------------------
    // 5. GENERATE TITLE WITHOUT USING AI TOKENS
    // ---------------------------------------------------------

    const topArtist = artists[0]?.name ?? "Your Playlist";

    const titleTemplates = [
      `${topArtist}'s Spotify: A Crime Scene`,
      `${topArtist} Has Questions`,
      `The ${topArtist} Incident`,
      `Spotify Court Is Now In Session`,
      `Your Playlist Has Been Charged`,
    ];

    // Stable title based on the data rather than Math.random()
    // so the same dataset gives a deterministic result.
    const titleIndex =
      (totalPlays + uniqueArtists + uniqueTracks) % titleTemplates.length;

    const title = titleTemplates[titleIndex];

    // ---------------------------------------------------------
    // 6. RETURN
    // ---------------------------------------------------------

    return NextResponse.json({
      roast: {
        title,
        roast: roastText,
      },

      stats: {
        artistsAnalyzed: uniqueArtists,

        uniqueArtists,

        diversityScore:
          totalPlays > 0 ? Math.round((uniqueArtists / totalPlays) * 100) : 0,

        topArtists: artists,
      },
    });
  } catch (error) {
    console.error("Roast route error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while generating the roast",
      },
      { status: 500 }
    );
  }
}
