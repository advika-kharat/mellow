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
    "https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Spotify analysis error:", data);

    return NextResponse.json(
      { error: "Failed to fetch music data" },
      { status: response.status }
    );
  }

  const artists = data.items;

  if (!artists.length) {
    return NextResponse.json(
      { error: "Not enough listening data" },
      { status: 404 }
    );
  }

  // Number of unique artists in the top 50
  const uniqueArtists = new Set(artists.map((artist: any) => artist.id));

  // How concentrated the taste is around the top 5 artists
  const topFiveShare = artists.slice(0, 5).length / artists.length;

  // Simple diversity score:
  // 100 = many different artists
  // 0 = heavily concentrated
  const diversityScore = Math.round(
    (uniqueArtists.size / artists.length) * 100
  );

  // Artist ranking curve
  const topArtist = artists[0]?.name;
  const topThreeArtists = artists.slice(0, 3).map((artist: any) => artist.name);

  return NextResponse.json({
    summary: {
      artistsAnalyzed: artists.length,
      uniqueArtists: uniqueArtists.size,
      diversityScore,
      topFiveShare,
      topArtist,
      topThreeArtists,
    },

    artists: artists.map((artist: any, index: number) => ({
      rank: index + 1,
      id: artist.id,
      name: artist.name,
      genres: artist.genres ?? [],
      popularity: artist.popularity ?? null,
    })),
  });
}
