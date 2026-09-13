import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("spotify_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Not connected to Spotify" },
      { status: 401 }
    );
  }

  // Get Spotify data
  const spotifyResponse = await fetch(
    "https://api.spotify.com/v1/me/top/artists?limit=20&time_range=medium_term",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const spotifyData = await spotifyResponse.json();

  if (!spotifyResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Spotify data" },
      { status: spotifyResponse.status }
    );
  }

  const artists = spotifyData.items;

  const artistNames = artists.map((artist: any) => artist.name);

  const uniqueArtists = new Set(artists.map((artist: any) => artist.id));

  const diversityScore = Math.round(
    (uniqueArtists.size / artists.length) * 100
  );

  // Give Qwen structured facts, not raw Spotify objects
  const musicProfile = {
    artistsAnalyzed: artists.length,
    uniqueArtists: uniqueArtists.size,
    diversityScore,
    topArtists: artistNames.slice(0, 10),
  };

  const prompt = `
You are Mellow, a witty music personality analyst.

Analyze this listener's music profile:

${JSON.stringify(musicProfile, null, 2)}

Create a fun but believable music persona.

Return ONLY valid JSON in exactly this format:

{
  "name": "short creative persona name",
  "tagline": "one sentence",
  "description": "2-3 sentences describing their musical personality",
  "traits": [
    "trait 1",
    "trait 2",
    "trait 3"
  ]
}

Do not invent listening statistics that aren't provided.
Do not mention that you are an AI.
Be playful, specific, and slightly witty.
`;

  const ollamaResponse = await fetch(
    `${process.env.OLLAMA_HOST}/api/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: `${process.env.OLLAMA_MODEL}`,
        prompt,
        stream: false,
        format: "json",
      }),
    }
  );

  if (!ollamaResponse.ok) {
    const error = await ollamaResponse.text();

    console.error("Ollama error:", error);

    return NextResponse.json(
      { error: "Failed to generate persona" },
      { status: 500 }
    );
  }

  const ollamaData = await ollamaResponse.json();

  let persona;

  try {
    persona = JSON.parse(ollamaData.response);
  } catch {
    console.error("Invalid JSON from Ollama:", ollamaData.response);

    return NextResponse.json(
      { error: "Ollama returned invalid persona data" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    persona,
    stats: musicProfile,
  });
}
