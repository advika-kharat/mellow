import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // 1. Ask Qwen3 to understand the user's query
    const planResponse = await fetch(
      `${request.nextUrl.origin}/api/ai/query-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!planResponse.ok) {
      throw new Error("Query planning failed");
    }

    const planData = await planResponse.json();

    console.log("QUERY PLAN:", JSON.stringify(planData, null, 2));

    // 2. Execute the validated query plan
    const executeResponse = await fetch(
      `${request.nextUrl.origin}/api/search/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planData),
      }
    );

    if (!executeResponse.ok) {
      throw new Error("Query execution failed");
    }

    const executionData = await executeResponse.json();

    console.log("EXECUTION DATA:", JSON.stringify(executionData, null, 2));

    // 3. Generate a natural-language answer
    // from the retrieved evidence
    const responseResponse = await fetch(
      `${request.nextUrl.origin}/api/ai/search-response`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          results: executionData.results,
        }),
      }
    );

    if (!responseResponse.ok) {
      throw new Error("AI response generation failed");
    }

    const responseData = await responseResponse.json();

    console.log("AI ANSWER:", responseData.answer);

    // IMPORTANT:
    // Return the original execution results unchanged.
    // Do not let the natural-language response model
    // modify or replace the structured evidence.
    return NextResponse.json({
      query,
      plan: planData.plan,
      results: executionData.results,
      answer: responseData.answer,
    });
  } catch (error) {
    console.error("AI search error:", error);

    return NextResponse.json(
      {
        error: "AI search failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
