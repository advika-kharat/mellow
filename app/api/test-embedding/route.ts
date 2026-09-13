import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function GET() {
  try {
    const embedding = await generateEmbedding("late night melancholic music");

    return NextResponse.json({
      success: true,
      dimensions: embedding.length,
      firstValues: embedding.slice(0, 5),
    });
  } catch (error) {
    console.error("Embedding error:", error);

    return NextResponse.json(
      { error: "Failed to generate embedding" },
      { status: 500 }
    );
  }
}
