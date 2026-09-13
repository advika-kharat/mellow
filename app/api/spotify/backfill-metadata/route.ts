import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSpotifyAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const accessToken = await getSpotifyAccessToken();

    const playsResult = await pool.query(`
      SELECT DISTINCT artist
      FROM listening_plays
      WHERE artist_id IS NULL
    `);

    const artists = playsResult.rows;

    let updated = 0;

    for (const row of artists) {
      const artistName = row.artist;

      const searchResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          `artist:${artistName}`
        )}&type=artist&limit=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        console.error(`Failed to search artist: ${artistName}`);
        continue;
      }

      const searchData = await searchResponse.json();
      const artist = searchData.artists?.items?.[0];

      if (!artist) {
        console.log(`Artist not found: ${artistName}`);
        continue;
      }

      const updateResult = await pool.query(
        `
        UPDATE listening_plays
        SET
          artist_id = $1,
          artist_genres = $2,
          artist_popularity = $3
        WHERE artist = $4
        `,
        [artist.id, artist.genres ?? [], artist.popularity ?? null, artistName]
      );

      updated += updateResult.rowCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      artistsProcessed: artists.length,
      playsUpdated: updated,
    });
  } catch (error) {
    console.error("Metadata backfill error:", error);

    return NextResponse.json(
      { error: "Metadata backfill failed" },
      { status: 500 }
    );
  }
}
