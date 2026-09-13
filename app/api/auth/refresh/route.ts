import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `
      SELECT spotify_account_id, refresh_token
      FROM spotify_accounts
      LIMIT 1
      `
    );

    if (!result.rows.length) {
      return NextResponse.json(
        { error: "No Spotify account found" },
        { status: 404 }
      );
    }

    const { spotify_account_id, refresh_token } = result.rows[0];

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Spotify refresh error:", data);

      return NextResponse.json(
        { error: "Failed to refresh Spotify token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      spotifyAccountId: spotify_account_id,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error("Refresh error:", error);

    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
