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

  const uniqueArtists = new Set(artists.map((artist: any) => artist.id));

  const diversityScore = Math.round(
    (uniqueArtists.size / artists.length) * 100
  );

  const topFive = artists.slice(0, 5);
  const topTen = artists.slice(0, 10);

  let archetype: string;
  let description: string;

  if (diversityScore >= 90 && topFive.length >= 5) {
    archetype = "The Musical Explorer";
    description =
      "You don't like staying in one musical neighborhood for too long.";
  } else if (diversityScore >= 75) {
    archetype = "The Curious Listener";
    description =
      "You have your favorites, but you're clearly willing to wander.";
  } else {
    archetype = "The Comfort-Artist Loyalist";
    description = "Once an artist gets into your rotation, you really commit.";
  }

  return NextResponse.json({
    persona: {
      archetype,
      description,
    },

    stats: {
      artistsAnalyzed: artists.length,
      uniqueArtists: uniqueArtists.size,
      diversityScore,
    },

    topArtists: topTen.map((artist: any, index: number) => ({
      rank: index + 1,
      name: artist.name,
    })),
  });
}
