import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

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

  const items = data.items;

  if (!items.length) {
    return NextResponse.json(
      { error: "No listening history found" },
      { status: 404 }
    );
  }

  // Count plays by artist
  const artistCounts: Record<string, number> = {};

  // Count plays by day
  const dailyCounts: Record<string, number> = {};

  // Count plays by track
  const trackCounts: Record<string, number> = {};

  for (const item of items) {
    const artist = item.track.artists[0]?.name ?? "Unknown";
    const track = item.track.name;

    const date = new Date(item.played_at).toISOString().split("T")[0];

    artistCounts[artist] = (artistCounts[artist] ?? 0) + 1;
    trackCounts[track] = (trackCounts[track] ?? 0) + 1;
    dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
  }

  const mostPlayedArtist = Object.entries(artistCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const mostPlayedTrack = Object.entries(trackCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const uniqueArtists = Object.keys(artistCounts).length;

  const dailyActivity = Object.entries(dailyCounts)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, plays]) => ({
      date,
      plays,
    }));

  return NextResponse.json({
    summary: {
      totalPlays: items.length,
      uniqueArtists,
      mostPlayedArtist: {
        name: mostPlayedArtist[0],
        plays: mostPlayedArtist[1],
      },
      mostPlayedTrack: {
        name: mostPlayedTrack[0],
        plays: mostPlayedTrack[1],
      },
    },

    dailyActivity,
  });
}
