"use client";

import { useEffect, useState, useRef } from "react";

export default function Callback() {
  const [message, setMessage] = useState("Connecting your Spotify...");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      setMessage(`Spotify authorization failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setMessage("Something went wrong — no authorization code found.");
      return;
    }

    fetch("/api/auth/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        state,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Authentication failed");
        }

        window.location.href = "/";
      })
      .catch((err) => {
        setMessage(`Error: ${err.message}`);
      });
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-3">
            <span className="text-3xl font-bold tracking-[-0.07em]">
              mellow
            </span>

            <span className="w-2 h-2 rounded-full bg-[#c8ff00] shadow-[0_0_14px_#c8ff00]" />
          </div>
        </div>

        {/* Loader */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border border-white/10 rounded-full" />

            <div className="absolute inset-0 border border-transparent border-t-[#c8ff00] rounded-full animate-spin" />

            <div className="absolute inset-[10px] border border-white/10 rounded-full" />

            <div className="absolute inset-[20px] bg-[#c8ff00] rounded-full shadow-[0_0_25px_rgba(200,255,0,0.35)]" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          {message}
        </h1>

        <p className="text-sm text-white/40">
          Mellow is getting to know your music.
        </p>

        {/* Bottom accent */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-white/10" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
            Spotify connection
          </span>
          <span className="w-8 h-px bg-white/10" />
        </div>
      </div>
    </main>
  );
}
