"use client";

import { useRef, useState } from "react";
import Nav from "@/app/components/Nav";

type Track = {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string | null;
};

type SearchResponse = {
  tracks: Track[];
};

type Analysis = {
  title?: string;
  explanation?: string;
  traits?: string[];
  similarSongs?: Array<{
    track: string;
    artist: string;
    reason?: string;
    image?: string | null;
  }>;
  selectedSong?: {
    track: string;
    artist: string;
    album: string;
    image?: string | null;
    plays?: number;
    distinctDays?: number;
  };
};

export default function WhyPage() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [error, setError] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function searchTracks(value: string) {
    setQuery(value);
    setSelectedTrack(null);
    setAnalysis(null);
    setError("");

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (value.trim().length < 2) {
      setTracks([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(value.trim())}`,
          {
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data: SearchResponse & {
          error?: string;
          details?: string;
        };

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Spotify search returned an invalid response (${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              data.details ||
              `Spotify search failed (${response.status}).`
          );
        }

        setTracks(data.tracks ?? []);
      } catch (err) {
        console.error("Spotify search failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Couldn't search Spotify right now."
        );

        setTracks([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function analyzeTrack() {
    if (!selectedTrack || analyzing) return;

    setAnalyzing(true);
    setAnalysis(null);
    setError("");

    try {
      const response = await fetch(
        `/api/ai/why?trackId=${encodeURIComponent(selectedTrack.id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data);
    } catch (err) {
      console.error("Why analysis failed:", err);

      setError(
        err instanceof Error ? err.message : "Couldn't analyze this song."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <Nav />

      <div className="mx-auto max-w-5xl px-5 pb-24 pt-14 md:px-10 md:pt-20">
        {/* HEADER */}
        <header className="mb-14">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 bg-[#c8ff00]" />

            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c8ff00]">
              Taste intelligence
            </span>
          </div>

          <h1 className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.055em] md:text-7xl">
            Why do you
            <br />
            like <span className="text-[#c8ff00]">this?</span>
          </h1>

          <p className="mt-7 max-w-xl text-sm leading-6 text-white/45 md:text-base">
            Search for any song. Mellow will look at your listening history and
            figure out why it fits your taste.
          </p>
        </header>

        {/* SEARCH */}
        <section className="border border-white/10 bg-white/[0.02] p-5 md:p-7">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
              Find a song
            </span>

            {searching && (
              <span className="font-mono text-[10px] text-[#c8ff00]">
                Searching...
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(event) => searchTracks(event.target.value)}
              placeholder="Search song or artist..."
              className="w-full border border-white/10 bg-[#0d0d0d] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#c8ff00]"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/25">
              ⌕
            </span>
          </div>

          {/* SEARCH RESULTS */}
          {tracks.length > 0 && !selectedTrack && (
            <div className="mt-3 border border-white/10 bg-[#0d0d0d]">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    setQuery(track.name);
                    setTracks([]);
                    setAnalysis(null);
                    setError("");
                  }}
                  className="flex w-full items-center gap-4 border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/[0.04]"
                >
                  {track.image ? (
                    <img
                      src={track.image}
                      alt=""
                      className="h-12 w-12 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/5 text-white/20">
                      ♪
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{track.name}</p>

                    <p className="mt-1 truncate text-xs text-white/35">
                      {track.artist}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-white/20">
                      {track.album}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query.trim().length >= 2 &&
            !searching &&
            tracks.length === 0 &&
            !selectedTrack &&
            !error && (
              <div className="mt-4 py-4 text-xs text-white/25">
                No songs found.
              </div>
            )}

          {/* SELECTED SONG */}
          {selectedTrack && (
            <div className="mt-4 flex flex-col gap-4 border border-white/10 bg-[#0d0d0d] p-4 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {selectedTrack.image ? (
                  <img
                    src={selectedTrack.image}
                    alt=""
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-white/5 text-xl text-white/20">
                    ♪
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {selectedTrack.name}
                  </p>

                  <p className="mt-1 truncate text-xs text-white/40">
                    {selectedTrack.artist}
                  </p>

                  <p className="mt-1 truncate text-[10px] text-white/20">
                    {selectedTrack.album}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTrack(null);
                    setAnalysis(null);
                    setError("");
                  }}
                  className="border border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white/35 transition hover:border-white/20 hover:text-white"
                >
                  Change
                </button>

                <button
                  onClick={analyzeTrack}
                  disabled={analyzing}
                  className="border border-[#c8ff00] px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#c8ff00] transition hover:bg-[#c8ff00] hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/20 disabled:hover:bg-transparent"
                >
                  {analyzing ? "Analyzing..." : "Analyze"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-5 border border-red-500/20 bg-red-500/[0.04] p-5 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ANALYZING */}
        {analyzing && (
          <section className="mt-10 border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 animate-pulse bg-[#c8ff00]" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8ff00]">
                Mellow is thinking
              </span>
            </div>

            <div className="mt-8 space-y-3">
              <div className="h-3 w-3/4 animate-pulse bg-white/[0.06]" />
              <div className="h-3 w-full animate-pulse bg-white/[0.06]" />
              <div className="h-3 w-2/3 animate-pulse bg-white/[0.06]" />
            </div>
          </section>
        )}

        {/* RESULT */}
        {analysis && !analyzing && (
          <section className="mt-10">
            {/* MAIN EXPLANATION */}
            <div className="border border-[#c8ff00]/30 bg-[#c8ff00]/[0.025] p-7 md:p-10">
              <div className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#c8ff00]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c8ff00]">
                  Mellow&apos;s take
                </span>
              </div>

              {analysis.title && (
                <h2 className="mt-7 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">
                  {analysis.title}
                </h2>
              )}

              {analysis.explanation && (
                <p className="mt-7 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
                  {analysis.explanation}
                </p>
              )}

              {/* TRAITS */}
              {analysis.traits && analysis.traits.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {analysis.traits.map((trait) => (
                    <span
                      key={trait}
                      className="border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/45"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* EVIDENCE */}
            {analysis.selectedSong && (
              <section className="mt-5 border border-white/10 bg-white/[0.02] p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">
                    Your evidence
                  </h3>

                  <span className="text-[10px] text-white/20">
                    from your history
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      Plays
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {analysis.selectedSong.plays ?? 0}
                    </p>
                  </div>

                  <div className="border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      Different days
                    </p>
                    <p className="mt-2 text-2xl font-black">
                      {analysis.selectedSong.distinctDays ?? 0}
                    </p>
                  </div>

                  <div className="border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-white/25">
                      Track
                    </p>
                    <p className="mt-2 truncate text-sm font-bold">
                      {analysis.selectedSong.track}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* SIMILAR SONGS */}
            {analysis.similarSongs && analysis.similarSongs.length > 0 && (
              <section className="mt-5">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">
                    Your taste overlap
                  </h3>

                  <span className="text-[10px] text-white/20">
                    from your history
                  </span>
                </div>

                <div className="divide-y divide-white/10 border-y border-white/10">
                  {analysis.similarSongs.map((song, index) => (
                    <div
                      key={`${song.track}-${index}`}
                      className="flex items-center gap-4 py-4"
                    >
                      {song.image ? (
                        <img
                          src={song.image}
                          alt=""
                          className="h-12 w-12 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center bg-white/5 text-white/20">
                          ♪
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {song.track}
                        </p>

                        <p className="mt-1 truncate text-xs text-white/35">
                          {song.artist}
                        </p>
                      </div>

                      {song.reason && (
                        <p className="hidden max-w-xs text-right text-xs leading-5 text-white/25 md:block">
                          {song.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
