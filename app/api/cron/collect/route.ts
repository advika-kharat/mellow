import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSpotifyAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accessToken = await getSpotifyAccessToken();

    // 1. Fetch recently played tracks
    const response = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch Spotify history",
          details: data,
        },
        { status: response.status }
      );
    }

    // 2. Get unique artist IDs
    const artistIds = Array.from(
      new Set<string>(
        data.items
          .map((item: any) => item.track.artists[0]?.id)
          .filter(
            (id: unknown): id is string =>
              typeof id === "string" && id.length > 0
          )
      )
    );

    // 3. Fetch artist metadata individually
    const artistMap: Record<
      string,
      {
        image: string | null;
        genres: string[];
        popularity: number | null;
      }
    > = {};

    await Promise.all(
      artistIds.map(async (artistId: string) => {
        try {
          const artistResponse = await fetch(
            `https://api.spotify.com/v1/artists/${artistId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          if (!artistResponse.ok) {
            console.error(
              `Failed to fetch artist ${artistId}:`,
              artistResponse.status
            );
            return;
          }

          const artistData = await artistResponse.json();

          artistMap[artistId] = {
            image: artistData.images?.[0]?.url ?? null,
            genres: artistData.genres ?? [],
            popularity: artistData.popularity ?? null,
          };
        } catch (error) {
          console.error(`Artist metadata error for ${artistId}:`, error);
        }
      })
    );

    // 4. Insert/update listening history
    const capturedAt = new Date();
    let newPlays = 0;

    for (const item of data.items) {
      const track = item.track;
      const artist = track.artists[0];

      const artistInfo = artist?.id ? artistMap[artist.id] : undefined;

      const artistImage = artistInfo?.image ?? null;
      const artistGenres = artistInfo?.genres ?? [];
      const artistPopularity = artistInfo?.popularity ?? null;

      // Spotify no longer provides track popularity
      const trackPopularity = null;

      // Album artwork is available directly on the track
      const trackImage = track.album?.images?.[0]?.url ?? null;

      const result = await pool.query(
        `
        INSERT INTO listening_plays
        (
          played_at,
          track,
          artist,
          album,
          captured_at,
          track_id,
          track_image,
          artist_image,
          artist_id,
          artist_genres,
          artist_popularity,
          track_popularity
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12
        )
        ON CONFLICT (played_at, track)
        DO UPDATE SET
          track_image = COALESCE(
            listening_plays.track_image,
            EXCLUDED.track_image
          ),
          artist_image = COALESCE(
            listening_plays.artist_image,
            EXCLUDED.artist_image
          ),
          artist_id = COALESCE(
            listening_plays.artist_id,
            EXCLUDED.artist_id
          ),
          artist_genres = COALESCE(
            listening_plays.artist_genres,
            EXCLUDED.artist_genres
          ),
          artist_popularity = COALESCE(
            listening_plays.artist_popularity,
            EXCLUDED.artist_popularity
          )
        `,
        [
          item.played_at,
          track.name,
          artist?.name ?? "Unknown",
          track.album?.name ?? "Unknown",
          capturedAt,
          track.id,
          trackImage,
          artistImage,
          artist?.id ?? null,
          artistGenres,
          artistPopularity,
          trackPopularity,
        ]
      );

      if (result.rowCount === 1) {
        newPlays++;
      }
    }

    // 5. Create snapshot
    await pool.query(
      `
      INSERT INTO listening_snapshots
        (plays_captured, new_plays)
      VALUES
        ($1, $2)
      `,
      [data.items.length, newPlays]
    );

    return NextResponse.json({
      success: true,
      playsCaptured: data.items.length,
      newPlays,
      artistsFetched: Object.keys(artistMap).length,
      capturedAt: capturedAt.toISOString(),
    });
  } catch (error) {
    console.error("Cron collection error:", error);

    return NextResponse.json({ error: "Collection failed" }, { status: 500 });
  }
}
