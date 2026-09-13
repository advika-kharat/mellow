import { NextRequest, NextResponse } from "next/server";
import { pipeline } from "@xenova/transformers";

import pool from "@/lib/db";
import { getSpotifyAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

let embeddingPipeline: any = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  return embeddingPipeline;
}

async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

function parseAIJson(raw: string) {
  let cleaned = raw.trim();

  // Remove markdown fences if Gemma adds them.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Sometimes the model adds text before/after the JSON.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get("trackId");

  if (!trackId) {
    return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
  }

  try {
    console.log("WHY: Starting analysis", trackId);

    // ------------------------------------------------------------
    // 1. Spotify access token
    // ------------------------------------------------------------

    const accessToken = await getSpotifyAccessToken();

    // ------------------------------------------------------------
    // 2. Fetch selected Spotify track
    // ------------------------------------------------------------

    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!trackResponse.ok) {
      const errorText = await trackResponse.text();

      console.error(
        "WHY: Spotify track request failed",
        trackResponse.status,
        errorText
      );

      return NextResponse.json(
        { error: "Could not fetch this Spotify track." },
        { status: trackResponse.status }
      );
    }

    const spotifyTrack = await trackResponse.json();

    const selectedTrack = {
      id: spotifyTrack.id,
      track: spotifyTrack.name,
      artist: spotifyTrack.artists?.[0]?.name ?? "Unknown artist",
      artistId: spotifyTrack.artists?.[0]?.id ?? null,
      album: spotifyTrack.album?.name ?? "Unknown album",
      image:
        spotifyTrack.album?.images?.[0]?.url ??
        spotifyTrack.album?.images?.[1]?.url ??
        null,
      durationMs: spotifyTrack.duration_ms ?? null,
      popularity: spotifyTrack.popularity ?? null,
    };

    console.log("WHY: Spotify track fetched");

    // ------------------------------------------------------------
    // 3. Fetch artist metadata
    // ------------------------------------------------------------

    let artistData: {
      name: string;
      genres: string[];
      popularity: number | null;
      image: string | null;
    } = {
      name: selectedTrack.artist,
      genres: [],
      popularity: null,
      image: null,
    };

    if (selectedTrack.artistId) {
      const artistResponse = await fetch(
        `https://api.spotify.com/v1/artists/${encodeURIComponent(
          selectedTrack.artistId
        )}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

      if (artistResponse.ok) {
        const artist = await artistResponse.json();

        artistData = {
          name: artist.name ?? selectedTrack.artist,
          genres: Array.isArray(artist.genres) ? artist.genres : [],
          popularity: artist.popularity ?? null,
          image: artist.images?.[0]?.url ?? artist.images?.[1]?.url ?? null,
        };
      }
    }

    console.log("WHY: Artist metadata fetched");

    // ------------------------------------------------------------
    // 4. Selected song listening history
    // ------------------------------------------------------------

    const historyResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS play_count,
        COUNT(
          DISTINCT DATE(
            played_at AT TIME ZONE COALESCE(
              (SELECT timezone FROM spotify_accounts LIMIT 1),
              'Asia/Kolkata'
            )
          )
        )::int AS distinct_days,
        MIN(played_at) AS first_played,
        MAX(played_at) AS last_played,
        COUNT(*) FILTER (
          WHERE local_hour >= 22 OR local_hour < 6
        )::int AS late_night_plays,
        COUNT(*) FILTER (
          WHERE is_weekend = true
        )::int AS weekend_plays
      FROM listening_plays
      WHERE track_id = $1
      `,
      [trackId]
    );

    const history = historyResult.rows[0];

    const playCount = Number(history?.play_count ?? 0);
    const distinctDays = Number(history?.distinct_days ?? 0);
    const lateNightPlays = Number(history?.late_night_plays ?? 0);
    const weekendPlays = Number(history?.weekend_plays ?? 0);

    const hasHistory = playCount > 0;

    console.log("WHY: Database behavior loaded", {
      playCount,
      distinctDays,
      hasHistory,
    });

    // ------------------------------------------------------------
    // 5. Overall listening behavior
    // ------------------------------------------------------------

    const overallResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_plays,
        COUNT(DISTINCT artist)::int AS unique_artists,
        COUNT(DISTINCT track)::int AS unique_tracks,
        COUNT(*) FILTER (
          WHERE local_hour >= 22 OR local_hour < 6
        )::int AS late_night_plays,
        COUNT(*) FILTER (
          WHERE is_weekend = true
        )::int AS weekend_plays
      FROM listening_plays
    `);

    const overall = overallResult.rows[0] ?? {};

    const totalPlays = Number(overall.total_plays ?? 0);
    const uniqueArtists = Number(overall.unique_artists ?? 0);
    const uniqueTracks = Number(overall.unique_tracks ?? 0);
    const totalLateNightPlays = Number(overall.late_night_plays ?? 0);
    const totalWeekendPlays = Number(overall.weekend_plays ?? 0);

    // ------------------------------------------------------------
    // 6. Artist listening history
    // ------------------------------------------------------------

    const artistHistoryResult = await pool.query(
      `
      SELECT
        COUNT(*)::int AS play_count,
        COUNT(DISTINCT track)::int AS distinct_tracks,
        COUNT(
          DISTINCT DATE(
            played_at AT TIME ZONE COALESCE(
              (SELECT timezone FROM spotify_accounts LIMIT 1),
              'Asia/Kolkata'
            )
          )
        )::int AS distinct_days,
        COUNT(*) FILTER (
          WHERE local_hour >= 22 OR local_hour < 6
        )::int AS late_night_plays,
        COUNT(*) FILTER (
          WHERE is_weekend = true
        )::int AS weekend_plays
      FROM listening_plays
      WHERE artist = $1
      `,
      [selectedTrack.artist]
    );

    const artistHistory = artistHistoryResult.rows[0] ?? {};

    // ------------------------------------------------------------
    // 7. Create semantic representation of selected song
    // ------------------------------------------------------------

    const selectedSongText = [
      selectedTrack.track,
      selectedTrack.artist,
      selectedTrack.album,
      artistData.genres.join(", "),
    ]
      .filter(Boolean)
      .join(" — ");

    console.log("WHY: Creating selected song embedding...");

    const selectedEmbedding = await createEmbedding(selectedSongText);

    console.log("WHY: Embedding created");

    // ------------------------------------------------------------
    // 8. Find semantically similar songs from user's history
    // ------------------------------------------------------------

    const embeddingVector = `[${selectedEmbedding.join(",")}]`;

    const similarResult = await pool.query(
      `
      SELECT
        lp.track,
        lp.artist,
        lp.album,
        lp.track_image,
        lp.artist_image,
        1 - (le.embedding <=> $1::vector) AS similarity,
        COUNT(lp.id) AS play_count
      FROM listening_embeddings le
      JOIN listening_plays lp
        ON lp.id = le.listening_play_id
      WHERE lp.track_id IS DISTINCT FROM $2
      GROUP BY
        lp.track,
        lp.artist,
        lp.album,
        lp.track_image,
        lp.artist_image,
        le.embedding
      ORDER BY le.embedding <=> $1::vector
      LIMIT 8
      `,
      [embeddingVector, trackId]
    );

    console.log("WHY: Similarity search complete");

    const similarSongs = similarResult.rows.map((row) => ({
      track: row.track,
      artist: row.artist,
      album: row.album,
      image: row.track_image ?? row.artist_image ?? null,
      similarity: Number(row.similarity ?? 0),
      playCount: Number(row.play_count ?? 0),
    }));

    // ------------------------------------------------------------
    // 9. Build evidence context for Gemma
    // ------------------------------------------------------------

    const evidence = {
      selectedSong: {
        track: selectedTrack.track,
        artist: selectedTrack.artist,
        album: selectedTrack.album,
        genres: artistData.genres,
        spotifyPopularity: selectedTrack.popularity,
      },

      listeningHistory: {
        hasHistory,
        playCount,
        distinctDays,
        firstPlayed: history?.first_played ?? null,
        lastPlayed: history?.last_played ?? null,
        lateNightPlays,
        weekendPlays,
      },

      artistHistory: {
        playCount: Number(artistHistory.play_count ?? 0),
        distinctTracks: Number(artistHistory.distinct_tracks ?? 0),
        distinctDays: Number(artistHistory.distinct_days ?? 0),
        lateNightPlays: Number(artistHistory.late_night_plays ?? 0),
        weekendPlays: Number(artistHistory.weekend_plays ?? 0),
      },

      overallListening: {
        totalPlays,
        uniqueArtists,
        uniqueTracks,
        lateNightPercentage:
          totalPlays > 0
            ? Math.round((totalLateNightPlays / totalPlays) * 100)
            : 0,
        weekendPercentage:
          totalPlays > 0
            ? Math.round((totalWeekendPlays / totalPlays) * 100)
            : 0,
      },

      similarSongs: similarSongs.map((song) => ({
        track: song.track,
        artist: song.artist,
        album: song.album,
        similarity: Number(song.similarity.toFixed(3)),
        playCount: song.playCount,
      })),
    };

    // ------------------------------------------------------------
    // 10. Build Gemma prompt
    // ------------------------------------------------------------

    const prompt = `
You are Mellow, a music intelligence assistant.

Analyze why the selected Spotify song may or may not fit the user's taste.

IMPORTANT:
- Only make claims supported by the evidence.
- Do NOT invent genres, moods, listening behavior, or preferences.
- Spotify popularity is NOT evidence that the user likes a song.
- If the selected song has no listening history, explicitly say that Mellow does not have direct historical evidence that the user has listened to it.
- Similar songs are semantic matches from the user's recorded listening history.
- Use those similar songs as evidence of possible taste overlap, but do not claim the user likes the selected song unless listening history confirms it.
- Keep the explanation concise and natural.
- Do not mention databases, SQL, embeddings, vector search, APIs, or implementation details.
- Return ONLY valid JSON.
- Do NOT wrap the JSON in markdown fences.

Return exactly this structure:

{
  "title": "short title",
  "explanation": "2-4 sentence explanation",
  "traits": ["trait 1", "trait 2", "trait 3"],
  "similarSongs": [
    {
      "track": "song name",
      "artist": "artist name",
      "reason": "short reason"
    }
  ]
}

Evidence:

${JSON.stringify(evidence, null, 2)}
`.trim();

    // ------------------------------------------------------------
    // 11. Ask local Gemma
    // ------------------------------------------------------------

    console.log("WHY: Sending request to Ollama");

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30_000);

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
            temperature: 0.3,
            num_predict: 180,
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      console.error(
        "WHY: Ollama request failed",
        ollamaResponse.status,
        errorText
      );

      return NextResponse.json(
        {
          error: "Local AI model failed to respond.",
        },
        { status: 500 }
      );
    }

    const ollamaData = await ollamaResponse.json();

    const raw = String(ollamaData.response ?? "").trim();

    console.log("WHY: Ollama response received");
    console.log("WHY: Raw AI response:", raw);

    // ------------------------------------------------------------
    // 12. Parse AI JSON safely
    // ------------------------------------------------------------

    let aiResult: {
      title: string;
      explanation: string;
      traits: string[];
      similarSongs: Array<{
        track: string;
        artist: string;
        reason?: string;
      }>;
    };

    try {
      aiResult = parseAIJson(raw);
    } catch (parseError) {
      console.error("WHY: Failed to parse AI JSON", parseError);

      // Never expose malformed model output to the user.
      aiResult = {
        title: hasHistory
          ? `Why "${selectedTrack.track}" fits`
          : `About "${selectedTrack.track}"`,

        explanation: hasHistory
          ? `You've listened to "${selectedTrack.track}" ${playCount} time${
              playCount === 1 ? "" : "s"
            } across ${distinctDays} different day${
              distinctDays === 1 ? "" : "s"
            }. That repeated listening is the strongest evidence Mellow has that this song fits your taste.`
          : `"${selectedTrack.track}" hasn't appeared in your recorded listening history yet, so Mellow can't confidently say that you already like it. Its strongest connections to your taste come from the songs in your history that are semantically similar to it.`,

        traits: [],

        similarSongs: similarSongs.slice(0, 3).map((song) => ({
          track: song.track,
          artist: song.artist,
          reason: "A similar song from your recorded listening history.",
        })),
      };
    }

    // ------------------------------------------------------------
    // 13. Normalize model output
    // ------------------------------------------------------------

    const normalizedTraits = Array.isArray(aiResult.traits)
      ? aiResult.traits
          .filter((trait): trait is string => typeof trait === "string")
          .slice(0, 5)
      : [];

    const normalizedSimilarSongs = Array.isArray(aiResult.similarSongs)
      ? aiResult.similarSongs
          .filter(
            (song) =>
              song &&
              typeof song.track === "string" &&
              typeof song.artist === "string"
          )
          .slice(0, 5)
          .map((song) => {
            const matchingSong = similarSongs.find(
              (candidate) =>
                candidate.track === song.track &&
                candidate.artist === song.artist
            );

            return {
              track: song.track,
              artist: song.artist,
              reason:
                typeof song.reason === "string"
                  ? song.reason
                  : "A similar song from your listening history.",
              image: matchingSong?.image ?? null,
            };
          })
      : [];

    const finalResult = {
      title:
        typeof aiResult.title === "string" && aiResult.title.trim()
          ? aiResult.title.trim()
          : hasHistory
            ? `Why "${selectedTrack.track}" fits`
            : `About "${selectedTrack.track}"`,

      explanation:
        typeof aiResult.explanation === "string" && aiResult.explanation.trim()
          ? aiResult.explanation.trim()
          : hasHistory
            ? `You've listened to "${selectedTrack.track}" ${playCount} times across ${distinctDays} different days.`
            : `"${selectedTrack.track}" isn't in your recorded listening history yet.`,

      traits: normalizedTraits,

      similarSongs: normalizedSimilarSongs,

      selectedSong: {
        track: selectedTrack.track,
        artist: selectedTrack.artist,
        album: selectedTrack.album,
        image: selectedTrack.image,
        plays: playCount,
        distinctDays,
      },

      evidence: {
        hasHistory,
        playCount,
        distinctDays,
        lateNightPlays,
        weekendPlays,
        artistPlayCount: Number(artistHistory.play_count ?? 0),
        artistDistinctDays: Number(artistHistory.distinct_days ?? 0),
        artistDistinctTracks: Number(artistHistory.distinct_tracks ?? 0),
      },
    };

    console.log("WHY: Analysis complete");

    return NextResponse.json(finalResult);
  } catch (error: any) {
    console.error("WHY: Unexpected error", error);

    if (error?.name === "AbortError") {
      return NextResponse.json(
        {
          error: "AI analysis timed out. Make sure Ollama is running.",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message || "Something went wrong while analyzing this song.",
      },
      { status: 500 }
    );
  }
}
