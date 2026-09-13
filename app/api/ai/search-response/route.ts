import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { query, results } = await request.json();

    if (!query || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Missing query or results" },
        { status: 400 }
      );
    }

    const prompt = `
You are Mellow, an AI music intelligence assistant.

Answer the user's music question using ONLY the listening-history results provided below.

User question:
${query}

Listening history:
${JSON.stringify(results, null, 2)}

Rules:
- Do not invent songs, artists, listening behavior, or facts.
- Mention specific songs/artists from the results when useful.
- Use the play counts and dates/context when relevant.
- If the results are insufficient to make a strong conclusion, say so.
- Be concise and conversational.
- Do not mention embeddings, vectors, SQL, RAG, or internal implementation.
- Do not say "based on the data" repeatedly.
- Return ONLY the natural-language answer.

Answer:
`;

    const response = await fetch(`${process.env.OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: `${process.env.OLLAMA_MODEL}`,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        { error: `Ollama request failed: ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      query,
      answer: data.response?.trim() ?? "",
    });
  } catch (error) {
    console.error("AI search response error:", error);

    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
