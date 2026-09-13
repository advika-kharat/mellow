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
    console.error("Spotify recently played error:", data);

    return NextResponse.json(
      { error: "Failed to fetch listening history" },
      { status: response.status }
    );
  }

  const history = data.items.map((item: any) => ({
    playedAt: item.played_at,
    track: item.track.name,
    artist: item.track.artists[0]?.name ?? "Unknown",
    album: item.track.album?.name ?? "Unknown",
    spotifyUrl: item.track.external_urls?.spotify ?? null,
  }));

  return NextResponse.json({
    count: history.length,
    history,
  });
}
