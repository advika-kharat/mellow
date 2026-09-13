import pool from "@/lib/db";

export async function getSpotifyAccessToken() {
  const result = await pool.query(
    `
    SELECT refresh_token
    FROM spotify_accounts
    LIMIT 1
    `
  );

  if (!result.rows.length) {
    throw new Error("No Spotify account connected");
  }

  const refreshToken = result.rows[0].refresh_token;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Spotify token refresh failed: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}
