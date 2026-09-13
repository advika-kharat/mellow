"use client";

import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import Nav from "../components/Nav";

type Artist = {
  name: string;
  image: string | null;
};

type Roast = {
  title: string;
  roast: string;
};

type RoastData = {
  roast: Roast;
  stats: {
    artistsAnalyzed: number;
    uniqueArtists: number;
    diversityScore: number;
    topArtists: Artist[];
  };
};

export default function RoastPage() {
  const [data, setData] = useState<RoastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(false);

  const shareRef = useRef<HTMLDivElement>(null);

  // Prevent React Strict Mode from triggering two Ollama requests
  // during development.
  const roastRequested = useRef(false);

  useEffect(() => {
    if (roastRequested.current) {
      return;
    }

    roastRequested.current = true;

    const controller = new AbortController();

    async function loadRoast() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch("/api/ai/roast", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = "Failed to fetch roast";

          try {
            const body = await response.json();

            if (body?.error) {
              message = body.error;
            }
          } catch {
            // Ignore invalid error response.
          }

          throw new Error(message);
        }

        const result: RoastData = await response.json();

        setData(result);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Failed to load roast:", error);
        setError(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRoast();

    return () => {
      controller.abort();
    };
  }, []);

  async function shareSnapshot() {
    if (!shareRef.current || !data) return;

    try {
      setSharing(true);

      const blob = await toBlob(shareRef.current, {
        backgroundColor: "#080808",
        pixelRatio: 2,
        cacheBust: true,
      });

      if (!blob) {
        throw new Error("Could not create snapshot");
      }

      const file = new File([blob], "mellow-roast.png", {
        type: "image/png",
      });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Mellow roasted my music",
          text: data.roast.title,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "mellow-roast.png";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Snapshot sharing failed:", error);
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-white">
        <Nav />

        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-[10px] uppercase tracking-[0.35em] text-[#c8ff00]">
              Mellow
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-white/30">
              Preparing your destruction...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#080808] text-white">
        <Nav />

        <div className="flex min-h-[80vh] items-center justify-center px-6">
          <div className="text-center">
            <div className="mb-4 text-2xl font-bold">Roast failed.</div>

            <div className="text-sm text-white/40">
              Mellow couldn't process this level of musical chaos.
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-8 border border-white/10 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:border-[#c8ff00]/50 hover:text-[#c8ff00]"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  const { roast, stats } = data;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <Nav />

      <div ref={shareRef}>
        {/* HERO / ROAST */}
        <section className="border-b border-white/10 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.35em] text-white/30">
                03 / Roast me
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={shareSnapshot}
                  disabled={sharing}
                  className="border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/50 transition-colors hover:border-[#c8ff00]/50 hover:text-[#c8ff00] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sharing ? "Creating..." : "↗ Share snapshot"}
                </button>

                <span className="hidden text-[10px] uppercase tracking-[0.25em] text-white/20 lg:block">
                  NO MERCY MODE
                </span>
              </div>
            </div>

            <div className="mb-8 flex items-center gap-3">
              <span className="h-2 w-2 bg-[#c8ff00]" />

              <span className="text-[10px] uppercase tracking-[0.3em] text-[#c8ff00]">
                Psychological damage complete
              </span>
            </div>

            <h1 className="max-w-7xl text-[clamp(3.5rem,9vw,9rem)] font-black leading-[0.82] tracking-[-0.07em]">
              {roast.title}
            </h1>

            <div className="mt-16 grid gap-10 md:grid-cols-[140px_1fr]">
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/20">
                The verdict
              </div>

              <div className="max-w-5xl">
                <p className="text-2xl font-medium leading-[1.15] tracking-[-0.025em] text-white/85 md:text-4xl lg:text-5xl">
                  "{roast.roast}"
                </p>
              </div>
            </div>

            <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-white/10 pt-6">
              <div>
                <div className="mb-1 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Artists analyzed
                </div>

                <div className="text-sm font-medium">
                  {stats.artistsAnalyzed}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Unique artists
                </div>

                <div className="text-sm font-medium">{stats.uniqueArtists}</div>
              </div>

              <div>
                <div className="mb-1 text-[9px] uppercase tracking-[0.25em] text-white/20">
                  Taste diversity
                </div>

                <div className="text-sm font-medium">
                  {stats.diversityScore}%
                </div>
              </div>

              <div className="ml-auto hidden text-[9px] uppercase tracking-[0.25em] text-white/15 md:block">
                Generated by Mellow AI
              </div>
            </div>
          </div>
        </section>

        {/* EVIDENCE */}
        <section className="border-b border-white/10 px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10">
              <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/25">
                Exhibit A
              </div>

              <h2 className="text-4xl font-bold tracking-[-0.04em] md:text-6xl">
                The evidence
              </h2>
            </div>

            <div className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-3">
              <div className="border-b border-r border-white/10 p-7 md:p-10">
                <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Artists analyzed
                </div>

                <div className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">
                  {stats.artistsAnalyzed}
                </div>

                <div className="mt-3 text-xs text-white/20">
                  Witnesses to the crime
                </div>
              </div>

              <div className="border-b border-r border-white/10 p-7 md:p-10">
                <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Unique artists
                </div>

                <div className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">
                  {stats.uniqueArtists}
                </div>

                <div className="mt-3 text-xs text-white/20">
                  Somehow still not enough
                </div>
              </div>

              <div className="border-b border-r border-white/10 p-7 md:p-10">
                <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Taste diversity
                </div>

                <div className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">
                  {stats.diversityScore}
                  <span className="text-2xl text-white/30">%</span>
                </div>

                <div className="mt-3 text-xs text-white/20">
                  The jury remains unconvinced
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP ARTISTS / SUSPECTS */}
        <section className="border-b border-white/10 px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/25">
                  Exhibit B
                </div>

                <h2 className="text-4xl font-bold tracking-[-0.04em] md:text-6xl">
                  The suspects
                </h2>
              </div>

              <div className="hidden text-[10px] uppercase tracking-[0.25em] text-white/20 md:block">
                Your most-played artists
              </div>
            </div>

            <div className="grid border-l border-t border-white/10 md:grid-cols-2">
              {stats.topArtists.slice(0, 10).map((artist, index) => (
                <div
                  key={`${artist.name}-${index}`}
                  className="flex items-center gap-5 border-b border-r border-white/10 p-5 transition-colors hover:bg-white/[0.025] md:p-7"
                >
                  <div className="w-8 shrink-0 text-[10px] font-mono text-white/20">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/5">
                    {artist.image ? (
                      <img
                        src={artist.image}
                        alt={artist.name}
                        crossOrigin="anonymous"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-white/20">
                        ♪
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold tracking-tight">
                      {artist.name}
                    </div>

                    <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/25">
                      Accomplice #{index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL ASSESSMENT */}
        <section className="px-6 py-20 md:px-10 md:py-32">
          <div className="mx-auto max-w-[1400px]">
            <div className="border border-white/10 p-8 md:p-14">
              <div className="mb-8 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/25">
                  Final assessment
                </div>

                <div className="h-2 w-2 bg-[#c8ff00]" />
              </div>

              <div className="max-w-5xl">
                <p className="text-3xl font-bold leading-tight tracking-[-0.04em] md:text-5xl">
                  No songs were harmed.
                  <br />
                  <span className="text-white/30">Your ego was.</span>
                </p>
              </div>

              <div className="mt-10 border-t border-white/10 pt-6 text-[9px] uppercase tracking-[0.25em] text-white/20">
                Mellow / Music intelligence / Case closed
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-10 md:px-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            Mellow
          </div>

          <div className="text-[9px] uppercase tracking-[0.25em] text-white/15">
            Your music, understood.
          </div>
        </div>
      </footer>
    </main>
  );
}
