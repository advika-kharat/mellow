"use client";

import { useEffect, useState } from "react";
import SpotifyAuth from "@/app/components/SpotifyAuth";

type HistoryData = {
  snapshots: number;
  totalPlays: number;
  uniqueArtists: number;
  uniqueTracks: number;

  topArtists: {
    artist: string;
    plays: number;
    image: string | null;
  }[];

  topTracks: {
    track: string;
    artist: string;
    plays: number;
    image: string | null;
  }[];

  dailyActivity: {
    date: string;
    plays: number;
  }[];
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    fetch("/api/spotify/history")
      .then(async (res) => {
        const result = await res.json();

        // Spotify authentication is required.
        if (res.status === 401) {
          setAuthRequired(true);
          return;
        }

        if (!res.ok) {
          throw new Error(result.error || "Something went wrong");
        }

        setData(result);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Spotify authentication required.
  if (authRequired) {
    return <SpotifyAuth />;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-3 h-3 rounded-full bg-[#c8ff00] shadow-[0_0_25px_#c8ff00] mx-auto mb-8 animate-pulse" />

          <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">
            Music through time
          </p>

          <h1 className="text-3xl md:text-5xl font-bold tracking-[-0.05em] mt-4">
            Tracing your listening...
          </h1>

          <p className="text-sm text-white/30 mt-4">
            looking through your history
          </p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-4xl text-[#c8ff00] mb-6">×</div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-[-0.04em]">
            Something went wrong.
          </h1>

          <p className="text-sm text-white/40 mt-4">{error}</p>
        </div>
      </main>
    );
  }

  const maxPlays = Math.max(...data.dailyActivity.map((item) => item.plays), 1);

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        {/* HERO */}
        <section className="relative min-h-[560px] md:min-h-[620px] flex flex-col justify-between py-10 md:py-14 border-b border-white/10 overflow-hidden">
          <div className="absolute -right-48 -top-48 w-[700px] h-[700px] rounded-full bg-[#c8ff00]/[0.04] blur-[150px] pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">
                02 / Music through time
              </p>

              <div className="flex items-center gap-2 mt-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" />

                <span className="text-[10px] uppercase tracking-widest text-white/40">
                  history tracking
                </span>
              </div>
            </div>

            <span className="hidden md:block text-[10px] uppercase tracking-[0.25em] text-white/20">
              MELLOW / HISTORY
            </span>
          </div>

          <div className="relative z-10 py-16">
            <p className="text-sm md:text-base text-white/30 mb-6">
              Your listening isn't static.
            </p>

            <h1 className="text-[14vw] md:text-[11vw] lg:text-[9vw] font-bold tracking-[-0.08em] leading-[0.76]">
              Evolving.
            </h1>

            <div className="mt-10 md:mt-14 grid md:grid-cols-[1fr_340px] gap-10 items-end">
              <p className="text-xl md:text-3xl text-white/60 leading-tight tracking-tight max-w-3xl">
                Mellow keeps watching what you play, and how your musical world
                changes.
              </p>

              <div className="border-l border-white/10 pl-6">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mb-3">
                  Current archive
                </p>

                <p className="text-sm text-white/35 leading-relaxed">
                  {data.snapshots} snapshots captured across your listening
                  history.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* OVERVIEW */}
        <section className="grid grid-cols-2 md:grid-cols-4 border-b border-white/10">
          <HistoryStat
            label="Plays captured"
            value={data.totalPlays}
            index="01"
          />

          <HistoryStat label="Artists" value={data.uniqueArtists} index="02" />

          <HistoryStat label="Tracks" value={data.uniqueTracks} index="03" />

          <HistoryStat
            label="Snapshots"
            value={data.snapshots}
            index="04"
            accent
          />
        </section>

        {/* ACTIVITY */}
        <section className="py-24 md:py-32 border-b border-white/10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/25">
                Your rhythm
              </p>

              <h2 className="text-5xl md:text-7xl font-bold tracking-[-0.06em] mt-3">
                Activity.
              </h2>
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
              plays captured / day
            </p>
          </div>

          {data.dailyActivity.length > 0 ? (
            <div className="border-y border-white/10 bg-white/[0.015]">
              <div className="overflow-x-auto">
                <div
                  className="flex items-end gap-2 md:gap-3 h-[360px] px-4 md:px-6 pt-8 pb-5"
                  style={{
                    minWidth: `${Math.max(
                      data.dailyActivity.length * 48,
                      600
                    )}px`,
                  }}
                >
                  {data.dailyActivity.map((day) => {
                    const height = (day.plays / maxPlays) * 100;

                    return (
                      <div
                        key={day.date}
                        className="group flex-1 flex flex-col justify-end items-center h-full min-w-8"
                      >
                        <span className="text-[10px] text-white/30 mb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.plays}
                        </span>

                        <div
                          className="relative w-full max-w-8 md:max-w-10 bg-white/10 group-hover:bg-[#c8ff00] transition-all duration-300"
                          style={{
                            height: `${Math.max(height, 5)}%`,
                          }}
                          title={`${day.date}: ${day.plays} plays`}
                        >
                          <div className="absolute inset-0 bg-[#c8ff00] opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                        </div>

                        <p className="text-[9px] text-white/20 mt-4 whitespace-nowrap">
                          {day.date.slice(5)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-y border-white/10 py-24 text-center">
              <p className="text-sm text-white/30">
                Not enough listening history yet.
              </p>

              <p className="text-[10px] uppercase tracking-widest text-white/15 mt-3">
                Keep listening
              </p>
            </div>
          )}
        </section>

        {/* TOP ARTISTS */}
        <section className="py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/25">
                Familiar voices
              </p>

              <h2 className="text-5xl md:text-7xl font-bold tracking-[-0.06em] mt-3">
                Artists.
              </h2>
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
              most played
            </p>
          </div>

          <div className="border-y border-white/10">
            {data.topArtists.map((artist, index) => (
              <div
                key={artist.artist}
                className="group flex items-center justify-between px-3 md:px-5 py-5 md:py-7 border-b border-white/10 last:border-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="flex items-center gap-5 md:gap-8 min-w-0">
                  <span className="text-[10px] text-white/20 w-6 shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.artist}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shrink-0 grayscale group-hover:grayscale-0 transition-all duration-300"
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/30 shrink-0">
                      ?
                    </div>
                  )}

                  <span className="text-xl md:text-3xl font-semibold tracking-[-0.03em] truncate group-hover:text-[#c8ff00] transition-colors">
                    {artist.artist}
                  </span>
                </div>

                <div className="flex items-center gap-5 md:gap-8 shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/25 hidden sm:block">
                    {artist.plays === 1 ? "1 play" : `${artist.plays} plays`}
                  </span>

                  <span className="text-white/20 group-hover:text-[#c8ff00] group-hover:translate-x-1 transition-all">
                    ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TOP TRACKS */}
        <section className="border-t border-white/10 py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/25">
                On repeat
              </p>

              <h2 className="text-5xl md:text-7xl font-bold tracking-[-0.06em] mt-3">
                Tracks.
              </h2>
            </div>

            <p className="text-[10px] uppercase tracking-[0.25em] text-white/25">
              most played
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">
            {data.topTracks.map((track, index) => (
              <div
                key={track.track}
                className="group bg-[#080808] p-6 md:p-8 hover:bg-[#0d0d0d] transition-colors"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex gap-5 min-w-0">
                    <span className="text-[10px] text-white/20 pt-1 w-5 shrink-0">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {track.image ? (
                      <img
                        src={track.image}
                        alt={track.track}
                        className="w-16 h-16 md:w-20 md:h-20 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 shrink-0 flex items-center justify-center text-xs text-white/30">
                        ?
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-lg md:text-xl font-semibold tracking-tight truncate group-hover:text-[#c8ff00] transition-colors">
                        {track.track}
                      </p>

                      <p className="text-xs text-white/40 mt-2 truncate">
                        {track.artist}
                      </p>

                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/25 mt-3">
                        {track.plays === 1 ? "1 play" : `${track.plays} plays`}
                      </p>
                    </div>
                  </div>

                  <span className="text-white/20 group-hover:text-[#c8ff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all shrink-0">
                    ↗
                  </span>
                </div>

                <div className="mt-8 flex items-center gap-1">
                  {Array.from({
                    length: Math.min(track.plays, 12),
                  }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1 flex-1 bg-white/10 group-hover:bg-[#c8ff00]/60 transition-colors"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL STATEMENT */}
        <section className="relative py-32 md:py-48 border-t border-white/10 overflow-hidden">
          <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-[#c8ff00]/10 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-8">
              The archive
            </p>

            <h2 className="text-5xl md:text-7xl lg:text-[7vw] font-bold tracking-[-0.07em] leading-[0.82] max-w-6xl">
              Every play
              <br />
              <span className="text-white/25">leaves a trace.</span>
            </h2>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/10 py-8 flex flex-col md:flex-row justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-white/25">
          <span>MELLOW © 2026</span>
          <span>Your music, understood.</span>
        </footer>
      </div>
    </main>
  );
}

function HistoryStat({
  label,
  value,
  index,
  accent = false,
}: {
  label: string;
  value: number;
  index: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-6 md:p-8 border-r border-white/10 last:border-r-0 ${
        accent ? "bg-white/[0.025]" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] text-white/20">{index}</span>

        {accent && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" />
        )}
      </div>

      <p className="text-[10px] uppercase tracking-[0.25em] text-white/25 mt-8">
        {label}
      </p>

      <p className="text-5xl md:text-6xl font-bold tracking-[-0.06em] mt-4">
        {value}
      </p>
    </div>
  );
}