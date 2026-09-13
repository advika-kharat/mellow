import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `
You are the query planner for Mellow, a personal Spotify listening intelligence app.

Convert the user's natural-language question into a STRICT JSON query plan.

You do NOT write SQL.
You do NOT execute queries.
You only produce the JSON object described below.

Available data:

TRACK-LEVEL BEHAVIOR:
- track
- artist
- album
- play_count
- distinct_days
- first_played_at
- last_played_at
- contexts_count
- late_night_plays
- weekend_plays

ARTIST-LEVEL BEHAVIOR:
- artist
- play_count
- distinct_days
- distinct_tracks
- first_played_at
- last_played_at
- late_night_plays
- weekend_plays

RAW LISTENING DATA:
- track
- artist
- album
- played_at
- local_hour
- local_weekday
- is_weekend
- listening_context

LISTENING CONTEXT VALUES:
- morning
- afternoon
- evening
- late night

Return EXACTLY this structure:

{
  "entity": "track" | "artist" | "play",
  "filters": {
    "artists": [],
    "tracks": [],
    "albums": [],
    "listening_context": [],
    "weekdays": [],
    "is_weekend": null,
    "local_hour_from": null,
    "local_hour_to": null,
    "date_from": null,
    "date_to": null
  },
  "behavior": {
    "min_play_count": null,
    "min_distinct_days": null,
    "sort": "relevance" | "play_count" | "recent" | "first_listened"
  },
  "semantic_query": null,
  "limit": 10
}

Rules:

1. Use "track" for songs/tracks.
2. Use "artist" for artists/singers.
3. Use "play" for individual listening events.
4. Put explicit artists, tracks, and albums in their corresponding filters.

5. Use listening_context for broad listening periods:
   - morning
   - afternoon
   - evening
   - late night

6. For "late night", ALWAYS use:
   "listening_context": ["late night"]
   Do NOT represent late night using local_hour_from/local_hour_to.

7. For "morning", "afternoon", and "evening", prefer the corresponding
   listening_context value unless the user explicitly provides clock times.

8. Use is_weekend for weekend requests.
   Use false for weekday requests.

9. Use local_hour_from and local_hour_to ONLY when the user explicitly
   gives a clock-time range, such as:
   - "between 10 PM and midnight"
   - "from 8am to 11am"
   - "around 7pm"

10. Use date_from and date_to for explicit dates or date ranges.

11. Use min_play_count when the user asks about:
   - repeated songs
   - favorites
   - most-played music
   - songs they keep playing
   - songs they are obsessed with

12. Use min_distinct_days when the user asks about music they repeatedly
   return to across different days.

   Interpret "across different days", "on different days", "keep coming back to",
   or "return to repeatedly" as:
   "min_distinct_days": 2

   Do NOT invent a larger number such as 7 unless the user explicitly
   specifies a number of days.

13. Never invent numeric thresholds from vague wording.
   If the user does not specify a number, use the smallest meaningful
   threshold for the requested behavior.

13. Use sort="recent" for recent/current listening.

14. Use sort="first_listened" for first/oldest discoveries.

15. Use sort="play_count" for most-played, favorite, staple,
   repeated, or obsession-like queries.

16. Use semantic_query for subjective concepts such as:
   - dreamy
   - sad
   - nostalgic
   - energetic
   - romantic
   - mysterious
   - comforting
   - chaotic
   - melancholic

17. If a query contains both objective behavioral constraints and a
   subjective concept, use BOTH deterministic filters and semantic_query.

18. Do not invent genres, popularity scores, moods, or metadata that is
   not available in the provided schema.

19. Only set "is_weekend": true when the user explicitly asks for
   weekends or Saturday/Sunday.

   Only set "is_weekend": false when the user explicitly asks for
   weekdays or Monday-Friday.

   Otherwise, ALWAYS use null.

19. Do not put subjective concepts into deterministic filters.

20. When semantic_query is present and the user is asking for songs
   matching that concept, use "sort": "relevance" unless the user
   explicitly requests another ordering.

20. If the user asks for "my music", infer the appropriate entity from
   the rest of the query. Prefer "track" when asking for songs.

21. Keep limit between 1 and 20. Default to 10.

22. Always return valid JSON.

23. Do not include markdown fences.

24. Do not include explanatory text outside the JSON.
`;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 }
      );
    }

    let body: { query?: string };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body",
          expected: {
            query: "What songs do I listen to late at night?",
          },
          received: rawBody,
        },
        { status: 400 }
      );
    }

    const query = body.query?.trim();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemma3:4b",
        system: SYSTEM_PROMPT,
        prompt: query,
        stream: false,
        format: "json",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Qwen3 request failed",
          details: data,
        },
        { status: 500 }
      );
    }

    if (!data.response) {
      return NextResponse.json(
        {
          error: "Qwen3 returned an empty response",
        },
        { status: 500 }
      );
    }

    let plan;

    try {
      plan = JSON.parse(data.response);
    } catch {
      console.error("Invalid Qwen3 JSON:", data.response);

      return NextResponse.json(
        {
          error: "Qwen3 returned invalid JSON",
          rawResponse: data.response,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      query,
      plan,
    });
  } catch (error) {
    console.error("Query planner error:", error);

    return NextResponse.json(
      {
        error: "Query planning failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
