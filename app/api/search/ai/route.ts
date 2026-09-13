import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  console.log("=== AI SEARCH ROUTE START ===");

  try {
    console.log("Reading request body...");

    const { query } = await request.json();

    console.log("Received query:", query);

    if (!query?.trim()) {
      console.log("ERROR: Missing query");

      return NextResponse.json(
        { error: "Missing query" },
        { status: 400 }
      );
    }

    // 1. Ask Qwen3 to understand the user's query
    const planUrl = `${request.nextUrl.origin}/api/ai/query-plan`;

    console.log("STEP 1: Calling query planner");
    console.log("Query planner URL:", planUrl);

    const planResponse = await fetch(planUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    console.log(
      "STEP 1: Query planner response status:",
      planResponse.status
    );

    if (!planResponse.ok) {
      const errorText = await planResponse.text();

      console.error(
        "STEP 1 FAILED: Query planner response:",
        errorText
      );

      throw new Error(
        `Query planning failed: ${planResponse.status} ${errorText}`
      );
    }

    const planData = await planResponse.json();

    console.log(
      "STEP 1 SUCCESS: QUERY PLAN:",
      JSON.stringify(planData, null, 2)
    );

    // 2. Execute the validated query plan
    const executeUrl = `${request.nextUrl.origin}/api/search/execute`;

    console.log("STEP 2: Executing query plan");
    console.log("Execution URL:", executeUrl);

    const executeResponse = await fetch(executeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(planData),
    });

    console.log(
      "STEP 2: Query execution response status:",
      executeResponse.status
    );

    if (!executeResponse.ok) {
      const errorText = await executeResponse.text();

      console.error(
        "STEP 2 FAILED: Query execution response:",
        errorText
      );

      throw new Error(
        `Query execution failed: ${executeResponse.status} ${errorText}`
      );
    }

    const executionData = await executeResponse.json();

    console.log(
      "STEP 2 SUCCESS: EXECUTION DATA:",
      JSON.stringify(executionData, null, 2)
    );

    // 3. Generate a natural-language answer
    // from the retrieved evidence
    const responseUrl = `${request.nextUrl.origin}/api/ai/search-response`;

    console.log("STEP 3: Calling AI response generator");
    console.log("AI response URL:", responseUrl);

    const responseResponse = await fetch(responseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        results: executionData.results,
      }),
    });

    console.log(
      "STEP 3: AI response status:",
      responseResponse.status
    );

    if (!responseResponse.ok) {
      const errorText = await responseResponse.text();

      console.error(
        "STEP 3 FAILED: AI response:",
        errorText
      );

      throw new Error(
        `AI response generation failed: ${responseResponse.status} ${errorText}`
      );
    }

    const responseData = await responseResponse.json();

    console.log(
      "STEP 3 SUCCESS: AI ANSWER:",
      responseData.answer
    );

    // IMPORTANT:
    // Return the original execution results unchanged.
    // Do not let the natural-language response model
    // modify or replace the structured evidence.
    console.log("AI SEARCH COMPLETE");

    return NextResponse.json({
      query,
      plan: planData.plan,
      results: executionData.results,
      answer: responseData.answer,
    });
  } catch (error) {
    console.error("=== AI SEARCH ERROR ===");
    console.error("AI search error:", error);

    return NextResponse.json(
      {
        error: "AI search failed",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}