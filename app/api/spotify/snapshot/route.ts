import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSpotifyAccessToken } from "@/lib/spotify";

export async function POST(request: NextRequest) {
  const accessToken = await getSpotifyAccessToken();

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
      { error: "Failed to fetch listening history" },
      { status: response.status }
    );
  }

  const capturedAt = new Date();

  let newPlays = 0;

  for (const item of data.items) {
    const playedAt = item.played_at;
    const track = item.track.name;
    const artist = item.track.artists[0]?.name ?? "Unknown";
    const album = item.track.album?.name ?? "Unknown";

    const result = await pool.query(
      `
      INSERT INTO listening_plays
        (played_at, track, artist, album, captured_at)
      VALUES
        ($1, $2, $3, $4, $5)
      ON CONFLICT (played_at, track)
      DO NOTHING
      `,
      [playedAt, track, artist, album, capturedAt]
    );

    if (result.rowCount === 1) {
      newPlays++;
    }
  }

  await pool.query(
    `
      INSERT INTO listening_snapshots
        (plays_captured, new_plays)
      VALUES
        ($1, $2)
      `,
    [data.items.length, newPlays]
  );

  const countResult = await pool.query("SELECT COUNT(*) FROM listening_plays");

  return NextResponse.json({
    success: true,
    newPlays,
    totalUniquePlays: Number(countResult.rows[0].count),
    capturedAt: capturedAt.toISOString(),
  });
}
