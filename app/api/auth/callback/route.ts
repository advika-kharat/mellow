import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { code, state, timezone } = await request.json();

    const savedState = request.cookies.get("spotify_state")?.value;
    const codeVerifier = request.cookies.get("spotify_code_verifier")?.value;

    if (!state || state !== savedState) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "Missing PKCE verifier" },
        { status: 400 }
      );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Missing Spotify configuration" },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Spotify token error:", tokenData);

      return NextResponse.json(
        { error: "Failed to exchange authorization code" },
        { status: 400 }
      );
    }

    console.log("Spotify authentication successful!");

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set("spotify_access_token", tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in,
      path: "/",
    });

    if (tokenData.refresh_token) {
      const meResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const meData = await meResponse.json();

      await pool.query(
        `
        INSERT INTO spotify_accounts
          (spotify_account_id, refresh_token, timezone)
        VALUES
          ($1, $2, $3)
        ON CONFLICT (spotify_account_id)
        DO UPDATE SET
          refresh_token = EXCLUDED.refresh_token,
          updated_at = NOW()
        `,
        [meData.account_id, tokenData.refresh_token, timezone ?? "UTC"]
      );

      response.cookies.set("spotify_refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 180,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
