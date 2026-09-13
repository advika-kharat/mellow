import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Spotify API error:", data);

    return NextResponse.json(
      { error: "Failed to fetch Spotify profile" },
      { status: response.status }
    );
  }

  return NextResponse.json({
    id: data.id,
    display_name: data.display_name,
    email: data.email,
    images: data.images,
    country: data.country,
    product: data.product,
  });
}
