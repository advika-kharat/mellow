import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

  try {
    const result = await pool.query(`
      SELECT
        played_at,
        track,
        artist,
        album,
        track_image,
        artist_image
      FROM listening_plays
      ORDER BY played_at ASC
    `);

    const plays = result.rows;

    if (!plays.length) {
      return NextResponse.json(
        { error: "No listening history found" },
        { status: 404 }
      );
    }

    const artistCounts: Record<string, number> = {};
    const trackCounts: Record<string, number> = {};

    const artistImages: Record<string, string | null> = {};
    const trackImages: Record<string, string | null> = {};
    const trackArtists: Record<string, string> = {};

    const dailyCounts: Record<string, number> = {};

    for (const play of plays) {
      // Artist counts
      artistCounts[play.artist] = (artistCounts[play.artist] ?? 0) + 1;

      // Keep the artist image
      if (!artistImages[play.artist] && play.artist_image) {
        artistImages[play.artist] = play.artist_image;
      }

      // Track counts
      trackCounts[play.track] = (trackCounts[play.track] ?? 0) + 1;

      // Keep track artwork + artist
      if (!trackImages[play.track] && play.track_image) {
        trackImages[play.track] = play.track_image;
      }

      trackArtists[play.track] = play.artist;

      // Daily activity
      const date = new Date(play.played_at).toISOString().split("T")[0];

      dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
    }

    const topArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, plays]) => ({
        artist,
        plays,
        image: artistImages[artist] ?? null,
      }));

    const topTracks = Object.entries(trackCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([track, plays]) => ({
        track,
        artist: trackArtists[track],
        plays,
        image: trackImages[track] ?? null,
      }));

    const dailyActivity = Object.entries(dailyCounts)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, plays]) => ({
        date,
        plays,
      }));

    const snapshotResult = await pool.query(
      "SELECT COUNT(*) FROM listening_snapshots"
    );

    return NextResponse.json({
      snapshots: Number(snapshotResult.rows[0].count),
      totalPlays: plays.length,
      uniqueArtists: Object.keys(artistCounts).length,
      uniqueTracks: Object.keys(trackCounts).length,
      topArtists,
      topTracks,
      dailyActivity,
    });
  } catch (error) {
    console.error("History database error:", error);

    return NextResponse.json(
      { error: "Failed to fetch listening history" },
      { status: 500 }
    );
  }
}
