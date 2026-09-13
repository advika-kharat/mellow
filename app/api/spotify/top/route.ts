import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

  const [artistsResponse, tracksResponse] = await Promise.all([
    fetch(
      "https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    ),

    fetch(
      "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    ),
  ]);

  const artists = await artistsResponse.json();
  const tracks = await tracksResponse.json();

  if (!artistsResponse.ok || !tracksResponse.ok) {
    console.error("Spotify top data error:", {
      artists,
      tracks,
    });

    return NextResponse.json(
      { error: "Failed to fetch top Spotify data" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    artists: artists.items.map((artist: any) => ({
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      image: artist.images?.[0]?.url ?? null,
    })),

    tracks: tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artist: track.artists[0]?.name,
      album: track.album?.name,
      image: track.album?.images?.[0]?.url ?? null,
      popularity: track.popularity,
    })),
  });
}
