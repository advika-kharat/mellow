"use client";

import { useEffect, useState } from "react";

type Pattern = {
  type: string;
  title: string;
  description: string;
  stat?: string;
  detail?: string;
};

type PatternsResponse = {
  patterns: Pattern[];
  summary?: {
    totalPlays: number;
    uniqueArtists: number;
    uniqueTracks: number;
  };
};

const patternIcons: Record<string, string> = {
  Timing: "◷",
  Repetition: "↻",
  Weekend: "◒",
  Artist: "✦",
  Habit: "∞",
};

const patternNumbers = ["01", "02", "03", "04", "05", "06"];

export default function PatternsPage() {
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadPatterns() {
    try {
      setLoading(true);
      setError(false);

      const response = await fetch("/api/patterns", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load patterns");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Patterns error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatterns();
  }, []);

  return (
    <main className="min-h-screen bg-[#080808] text-white">


      <div className="mx-auto max-w-6xl px-5 pb-24 pt-14 md:px-10 md:pt-20">
        {/* HEADER */}
        <header className="mb-14 md:mb-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 bg-[#c8ff00]" />

            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c8ff00]">
              Listening intelligence
            </span>
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-7xl">
            Your music
            <br />
            has <span className="text-[#c8ff00]">tells.</span>
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-6 text-white/45 md:text-base">
            Mellow went through your listening history and found behavioral
            patterns hiding underneath the songs.
          </p>
        </header>

        {/* LOADING */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[290px] animate-pulse border border-white/10 bg-white/[0.025]"
              />
            ))}
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <section className="border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              Analysis failed
            </div>

            <p className="mt-4 text-white/50">
              Mellow couldn't analyze your listening history.
            </p>

            <button
              onClick={loadPatterns}
              className="mt-7 border border-[#c8ff00] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#c8ff00] transition hover:bg-[#c8ff00] hover:text-black"
            >
              Try again
            </button>
          </section>
        )}

        {/* EMPTY */}
        {!loading && !error && data && data.patterns.length === 0 && (
          <section className="border border-white/10 bg-white/[0.02] p-10 md:p-14">
            <div className="text-5xl">∅</div>

            <h2 className="mt-7 text-2xl font-black">
              Not enough history yet.
            </h2>

            <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">
              Keep listening. Mellow needs a little more history before it can
              start exposing your musical habits.
            </p>
          </section>
        )}

        {/* PATTERNS */}
        {!loading && !error && data && data.patterns.length > 0 && (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              {data.patterns.map((pattern, index) => (
                <PatternCard
                  key={`${pattern.type}-${index}`}
                  pattern={pattern}
                  index={index}
                />
              ))}
            </section>

            {/* DATA FOOTER */}
            {data.summary && (
              <section className="mt-5 grid grid-cols-3 border border-white/10 bg-white/[0.015]">
                <MiniStat
                  value={data.summary.totalPlays}
                  label="plays analyzed"
                />

                <MiniStat
                  value={data.summary.uniqueTracks}
                  label="unique tracks"
                />

                <MiniStat value={data.summary.uniqueArtists} label="artists" />
              </section>
            )}

            <div className="mt-12 flex items-center gap-3">
              <span className="h-1 w-1 bg-[#c8ff00]" />

              <p className="text-[10px] uppercase tracking-[0.22em] text-white/25">
                Based on your Mellow listening history
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function PatternCard({ pattern, index }: { pattern: Pattern; index: number }) {
  const icon = patternIcons[pattern.type] ?? "✦";
  const number = patternNumbers[index] ?? String(index + 1).padStart(2, "0");

  return (
    <article className="group relative overflow-hidden border border-white/10 bg-white/[0.02] p-7 transition duration-300 hover:border-[#c8ff00]/50 hover:bg-white/[0.035] md:min-h-[300px] md:p-9">
      {/* NUMBER */}
      <div className="absolute right-7 top-7 font-mono text-[10px] tracking-[0.2em] text-white/20">
        {number}
      </div>

      {/* CATEGORY */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center border border-[#c8ff00]/30 text-sm text-[#c8ff00]">
          {icon}
        </span>

        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8ff00]">
          {pattern.type}
        </span>
      </div>

      {/* TITLE */}
      <h2 className="mt-9 max-w-md text-3xl font-black leading-[0.95] tracking-[-0.04em] md:text-4xl">
        {pattern.title}
      </h2>

      {/* STAT */}
      {pattern.stat && (
        <div className="mt-8 border-l-2 border-[#c8ff00] pl-4">
          <p className="text-xl font-black leading-tight md:text-2xl">
            {pattern.stat}
          </p>
        </div>
      )}

      {/* DESCRIPTION */}
      <p className="mt-6 max-w-lg text-sm leading-6 text-white/55">
        {pattern.description}
      </p>

      {/* EVIDENCE */}
      {pattern.detail && (
        <div className="mt-7 border-t border-white/10 pt-4">
          <p className="text-[11px] leading-5 text-white/30">
            <span className="mr-2 font-bold uppercase tracking-wider text-white/20">
              Evidence
            </span>
            {pattern.detail}
          </p>
        </div>
      )}

      {/* HOVER LINE */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-[#c8ff00] transition-all duration-500 group-hover:w-full" />
    </article>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-r border-white/10 p-5 last:border-r-0 md:p-6">
      <div className="text-2xl font-black tracking-tight md:text-3xl">
        {value.toLocaleString()}
      </div>

      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/25">
        {label}
      </div>
    </div>
  );
}
