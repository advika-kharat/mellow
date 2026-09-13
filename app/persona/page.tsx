"use client";

import { useEffect, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import Nav from "../components/Nav";

type PersonaData = {
  persona: {
    name: string;
    tagline: string;
    description: string;
    traits: string[];
  };
  stats: {
    artistsAnalyzed: number;
    uniqueArtists: number;
    diversityScore: number;
    topArtists: {
      name: string;
      image: string | null;
    }[];
    topTracks: {
      id: string;
      name: string;
      artist: string;
      album: string;
      image: string | null;
    }[];
  };
};

type SpotifyTopArtist = {
  name: string;
  image: string | null;
};

type SpotifyTopTrack = {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
};

export default function PersonaPage() {
  const [data, setData] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [personaRes, topRes] = await Promise.all([
          fetch("/api/ai/persona"),
          fetch("/api/spotify/top"),
        ]);

        if (!personaRes.ok) {
          throw new Error(`Persona API failed: ${personaRes.status}`);
        }

        if (!topRes.ok) {
          throw new Error(`Spotify top API failed: ${topRes.status}`);
        }

        const persona = await personaRes.json();
        const top = await topRes.json();

        /*
         * /api/ai/persona:
         *
         * stats.topArtists = [
         *   "The Strokes",
         *   "Lana Del Rey",
         *   ...
         * ]
         *
         * /api/spotify/top:
         *
         * artists = [
         *   {
         *     name: "The Strokes",
         *     image: "..."
         *   }
         * ]
         *
         * tracks = [
         *   {
         *     id: "...",
         *     name: "Alarm",
         *     artist: "Alarm Tones",
         *     album: "Alarm",
         *     image: "..."
         *   }
         * ]
         *
         * Therefore:
         * - Use Spotify top artists for artist cards.
         * - Use Spotify top tracks for track cards.
         * - Use Persona API only for persona + stats.
         */

        const topArtists: SpotifyTopArtist[] = Array.isArray(top.artists)
          ? top.artists.map((artist: any) => ({
              name: artist.name ?? "",
              image: artist.image ?? null,
            }))
          : [];

        const topTracks: SpotifyTopTrack[] = Array.isArray(top.tracks)
          ? top.tracks.map((track: any) => ({
              id: track.id ?? "",
              name: track.name ?? "",
              artist: track.artist ?? "",
              album: track.album ?? "",
              image: track.image ?? null,
            }))
          : [];

        setData({
          ...persona,
          stats: {
            ...persona.stats,

            topArtists,

            topTracks,
          },
        });
      } catch (error) {
        console.error("Failed to load persona:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

      const file = new File([blob], "mellow-persona.png", {
        type: "image/png",
      });

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "My Mellow music persona",
          text: `My music persona is "${data.persona.name}" — Mellow`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "mellow-persona.png";

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
              Reading your music...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#080808] text-white">
        <Nav />

        <div className="flex min-h-[80vh] items-center justify-center px-6">
          <div className="text-center">
            <div className="mb-4 text-2xl font-bold">Something went wrong.</div>

            <div className="text-sm text-white/40">
              Mellow couldn't generate your persona.
            </div>
          </div>
        </div>
      </main>
    );
  }

  const { persona, stats } = data;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <Nav />

      <div ref={shareRef}>
        {/* HERO */}
        <section className="border-b border-white/10 px-6 pb-24 pt-16 md:px-10 md:pb-32 md:pt-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-8 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.35em] text-white/30">
                02 / Persona
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
                  MELLOW / PERSONA
                </span>
              </div>
            </div>

            <div className="mb-8 flex items-center gap-3">
              <span className="h-2 w-2 bg-[#c8ff00]" />

              <span className="text-[10px] uppercase tracking-[0.3em] text-[#c8ff00]">
                Analysis complete
              </span>
            </div>

            <h1 className="max-w-6xl text-[clamp(4rem,11vw,11rem)] font-black leading-[0.8] tracking-[-0.07em]">
              {persona.name}
            </h1>

            <div className="mt-12 grid gap-10 md:grid-cols-[1fr_420px] md:items-end">
              <div>
                <p className="max-w-3xl text-2xl font-medium leading-tight tracking-tight text-white/80 md:text-4xl">
                  {persona.tagline}
                </p>
              </div>

              <div>
                <p className="text-sm leading-7 text-white/45">
                  {persona.description}
                </p>
              </div>
            </div>

            {persona.traits?.length > 0 && (
              <div className="mt-14 flex flex-wrap gap-2">
                {persona.traits.map((trait) => (
                  <span
                    key={trait}
                    className="border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-white/55"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* STATS */}
        <section className="border-b border-white/10 px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10 text-[10px] uppercase tracking-[0.3em] text-white/25">
              The numbers
            </div>

            <div className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-3">
              <div className="border-b border-r border-white/10 p-7 md:p-10">
                <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Artists analyzed
                </div>

                <div className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">
                  {stats.artistsAnalyzed}
                </div>
              </div>

              <div className="border-b border-r border-white/10 p-7 md:p-10">
                <div className="mb-4 text-[10px] uppercase tracking-[0.25em] text-white/30">
                  Unique artists
                </div>

                <div className="text-5xl font-bold tracking-[-0.05em] md:text-7xl">
                  {stats.uniqueArtists}
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
              </div>
            </div>
          </div>
        </section>

        {/* TOP ARTISTS */}
        <section className="border-b border-white/10 px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 flex items-end justify-between">
              <div>
                <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/25">
                  Your rotation
                </div>

                <h2 className="text-4xl font-bold tracking-[-0.04em] md:text-6xl">
                  Top artists
                </h2>
              </div>

              <div className="hidden text-[10px] uppercase tracking-[0.25em] text-white/20 md:block">
                Based on your listening history
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
                    <div className="truncate text-lg font-semibold tracking-tight text-white">
                      {artist.name}
                    </div>

                    <div className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/25">
                      Artist
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TOP TRACKS */}
        <section className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12">
              <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/25">
                On repeat
              </div>

              <h2 className="text-4xl font-bold tracking-[-0.04em] md:text-6xl">
                Top tracks
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {stats.topTracks.slice(0, 4).map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className="group border border-white/10 bg-white/[0.015] p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex gap-5">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-white/5">
                      {track.image ? (
                        <img
                          src={track.image}
                          alt={track.album}
                          crossOrigin="anonymous"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl text-white/20">
                          ♪
                        </div>
                      )}

                      <div className="absolute left-2 top-2 text-[9px] font-bold text-white/70">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                      <div>
                        <div className="truncate text-lg font-semibold tracking-tight text-white">
                          {track.name}
                        </div>

                        <div className="mt-1 truncate text-sm text-white/60">
                          {track.artist}
                        </div>
                      </div>

                      <div className="truncate text-[9px] uppercase tracking-[0.2em] text-white/30">
                        {track.album}
                      </div>
                    </div>
                  </div>

                  {track.id && (
                    <div className="mt-4 overflow-hidden border-t border-white/5 pt-4">
                      <iframe
                        src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                        width="100%"
                        height="80"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="opacity-80"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
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
