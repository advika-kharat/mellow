import { NextRequest, NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({
      tracks: [],
    });
  }

  try {
    const accessToken = await getSpotifyAccessToken();

    const spotifyUrl =
      `https://api.spotify.com/v1/search` +
      `?q=${encodeURIComponent(query)}` +
      `&type=track` +
      `&limit=8`;

    const response = await fetch(spotifyUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();

      console.error("Spotify search failed:", response.status, text);

      return NextResponse.json(
        {
          error: "Spotify search failed",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const tracks =
      data.tracks?.items?.map((track: any) => ({
        id: track.id,
        name: track.name,
        artist: track.artists?.[0]?.name ?? "Unknown artist",
        album: track.album?.name ?? "Unknown album",
        image: track.album?.images?.[0]?.url ?? null,
      })) ?? [];

    return NextResponse.json({
      tracks,
    });
  } catch (error) {
    console.error("Spotify search error:", error);

    return NextResponse.json(
      {
        error: "Failed to search Spotify",
      },
      { status: 500 }
    );
  }
}
