import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

type QueryPlan = {
  entity: "track" | "artist" | "play";

  filters?: {
    artists?: string[];
    tracks?: string[];
    albums?: string[];
    listening_context?: string[];
    weekdays?: string[];
    is_weekend?: boolean | null;
    local_hour_from?: number | null;
    local_hour_to?: number | null;
    date_from?: string | null;
    date_to?: string | null;
  };

  behavior?: {
    min_play_count?: number | null;
    min_distinct_days?: number | null;
    sort?: "relevance" | "play_count" | "recent" | "first_listened";
  };

  semantic_query?: string | null;
  limit?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan: QueryPlan = body.plan;

    if (!plan) {
      return NextResponse.json(
        { error: "Missing query plan" },
        { status: 400 }
      );
    }

    if (!["track", "artist", "play"].includes(plan.entity)) {
      return NextResponse.json({ error: "Invalid entity" }, { status: 400 });
    }

    const filters = plan.filters ?? {};
    const behavior = plan.behavior ?? {};

    const params: unknown[] = [];

    const addParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    // --------------------------------------------------
    // WHERE conditions
    // --------------------------------------------------

    const conditions: string[] = [];

    if (filters.artists?.length) {
      const placeholder = addParam(filters.artists);

      conditions.push(`lp.artist = ANY(${placeholder}::text[])`);
    }

    if (filters.tracks?.length) {
      const placeholder = addParam(filters.tracks);

      conditions.push(`lp.track = ANY(${placeholder}::text[])`);
    }

    if (filters.albums?.length) {
      const placeholder = addParam(filters.albums);

      conditions.push(`lp.album = ANY(${placeholder}::text[])`);
    }

    if (filters.listening_context?.length) {
      const placeholder = addParam(filters.listening_context);

      conditions.push(`lp.listening_context = ANY(${placeholder}::text[])`);
    }

    if (filters.weekdays?.length) {
      const placeholder = addParam(filters.weekdays);

      conditions.push(`lp.local_weekday = ANY(${placeholder}::text[])`);
    }

    if (filters.is_weekend !== null && filters.is_weekend !== undefined) {
      const placeholder = addParam(filters.is_weekend);

      conditions.push(`lp.is_weekend = ${placeholder}`);
    }

    if (
      filters.local_hour_from !== null &&
      filters.local_hour_from !== undefined &&
      filters.local_hour_to !== null &&
      filters.local_hour_to !== undefined
    ) {
      const from = addParam(filters.local_hour_from);

      const to = addParam(filters.local_hour_to);

      const fromHour = Number(filters.local_hour_from);

      const toHour = Number(filters.local_hour_to);

      if (fromHour <= toHour) {
        conditions.push(`lp.local_hour BETWEEN ${from} AND ${to}`);
      } else {
        conditions.push(`(lp.local_hour >= ${from} OR lp.local_hour <= ${to})`);
      }
    }

    if (filters.date_from) {
      const placeholder = addParam(filters.date_from);

      conditions.push(`lp.played_at >= ${placeholder}::date`);
    }

    if (filters.date_to) {
      const placeholder = addParam(filters.date_to);

      conditions.push(
        `lp.played_at < (${placeholder}::date + INTERVAL '1 day')`
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join("\n AND ")}` : "";

    // --------------------------------------------------
    // PLAY ENTITY
    // --------------------------------------------------

    if (plan.entity === "play") {
      let orderBy = "lp.played_at DESC";

      switch (behavior.sort) {
        case "first_listened":
          orderBy = "lp.played_at ASC";
          break;

        case "recent":
        case "relevance":
        default:
          orderBy = "lp.played_at DESC";
          break;
      }

      const limit = Math.min(Math.max(Number(plan.limit) || 10, 1), 20);

      const limitPlaceholder = addParam(limit);

      const sql = `
        SELECT
          lp.id,
          lp.track,
          lp.artist,
          lp.album,
          lp.played_at,
          lp.local_hour,
          lp.local_weekday,
          lp.is_weekend,
          lp.listening_context,
          lp.track_image,
          lp.artist_image
        FROM listening_plays lp
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ${limitPlaceholder}
      `;

      console.log("Query plan:", JSON.stringify(plan));

      console.log("Generated SQL:", sql);

      console.log("SQL params:", JSON.stringify(params));

      const result = await pool.query(sql, params);

      return NextResponse.json({
        plan,
        results: result.rows,
        count: result.rows.length,
      });
    }

    // --------------------------------------------------
    // TRACK / ARTIST ENTITY
    // --------------------------------------------------

    const isTrack = plan.entity === "track";

    const selectColumns = isTrack
      ? `
        lp.track,
        lp.artist,
        lp.album,
        lp.track_id,
        MAX(lp.track_image) AS track_image,
        MAX(lp.artist_image) AS artist_image
      `
      : `
        lp.artist,
        lp.artist_id,
        MAX(lp.artist_image) AS artist_image
      `;

    const groupBy = isTrack
      ? `
        lp.track,
        lp.artist,
        lp.album,
        lp.track_id
      `
      : `
        lp.artist,
        lp.artist_id
      `;

    // --------------------------------------------------
    // OPTIONAL SEMANTIC SEARCH
    // --------------------------------------------------

    let semanticEmbedding: number[] | null = null;

    if (plan.semantic_query?.trim()) {
      semanticEmbedding = await generateEmbedding(plan.semantic_query.trim());
    }

    let semanticSelect = "";
    let semanticJoin = "";

    if (semanticEmbedding) {
      const embeddingVector = `[${semanticEmbedding.join(",")}]`;

      const embeddingPlaceholder = addParam(embeddingVector);

      semanticSelect = `,
        AVG(
          1 - (
            le.embedding <=> ${embeddingPlaceholder}::vector
          )
        ) AS similarity
      `;

      semanticJoin = `
        JOIN listening_embeddings le
          ON le.listening_play_id = lp.id
      `;
    }

    // --------------------------------------------------
    // AGGREGATION
    // --------------------------------------------------

    const baseStats = `
      COUNT(*) AS play_count,

      COUNT(
        DISTINCT DATE(
          lp.played_at AT TIME ZONE 'Asia/Kolkata'
        )
      ) AS distinct_days,

      MIN(lp.played_at) AS first_played_at,

      MAX(lp.played_at) AS last_played_at,

      COUNT(
        DISTINCT lp.listening_context
      ) AS contexts_count,

      COUNT(*) FILTER (
        WHERE lp.listening_context = 'late night'
      ) AS late_night_plays,

      COUNT(*) FILTER (
        WHERE lp.is_weekend = true
      ) AS weekend_plays
    `;

    // --------------------------------------------------
    // HAVING conditions
    // --------------------------------------------------

    const havingConditions: string[] = [];

    if (
      behavior.min_play_count !== null &&
      behavior.min_play_count !== undefined
    ) {
      const placeholder = addParam(Number(behavior.min_play_count));

      havingConditions.push(`COUNT(*) >= ${placeholder}`);
    }

    if (
      behavior.min_distinct_days !== null &&
      behavior.min_distinct_days !== undefined
    ) {
      const placeholder = addParam(Number(behavior.min_distinct_days));

      havingConditions.push(
        `COUNT(
          DISTINCT DATE(
            lp.played_at AT TIME ZONE 'Asia/Kolkata'
          )
        ) >= ${placeholder}`
      );
    }

    const havingClause =
      havingConditions.length > 0
        ? `HAVING ${havingConditions.join("\n AND ")}`
        : "";

    // --------------------------------------------------
    // ORDERING
    // --------------------------------------------------

    let orderBy = "last_played_at DESC";

    if (semanticEmbedding) {
      orderBy = "similarity DESC, last_played_at DESC";
    } else {
      switch (behavior.sort) {
        case "play_count":
          orderBy = "play_count DESC, last_played_at DESC";
          break;

        case "recent":
          orderBy = "last_played_at DESC";
          break;

        case "first_listened":
          orderBy = "first_played_at ASC";
          break;

        case "relevance":
        default:
          orderBy = "last_played_at DESC";
          break;
      }
    }

    // --------------------------------------------------
    // LIMIT
    // --------------------------------------------------

    const limit = Math.min(Math.max(Number(plan.limit) || 10, 1), 20);

    const limitPlaceholder = addParam(limit);

    // --------------------------------------------------
    // FINAL SQL
    // --------------------------------------------------

    const sql = `
      SELECT
        ${selectColumns},
        ${baseStats}
        ${semanticSelect}
      FROM listening_plays lp
      ${semanticJoin}
      ${whereClause}
      GROUP BY ${groupBy}
      ${havingClause}
      ORDER BY ${orderBy}
      LIMIT ${limitPlaceholder}
    `;

    // --------------------------------------------------
    // DEBUG LOGGING
    // --------------------------------------------------

    console.log("Query plan:", JSON.stringify(plan));

    console.log("Generated SQL:", sql);

    console.log("SQL params:", JSON.stringify(params));

    // --------------------------------------------------
    // EXECUTE
    // --------------------------------------------------

    const result = await pool.query(sql, params);

    console.log("Rows returned:", result.rows.length);

    return NextResponse.json({
      plan,
      results: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Query execution error:", error);

    return NextResponse.json(
      {
        error: "Query execution failed",

        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
