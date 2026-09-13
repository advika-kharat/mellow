"use client";

import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SpotifyAuth from "@/app/components/SpotifyAuth";

type EntityType = "track" | "artist" | "play";

type SearchResult = {
  track?: string;
  artist?: string;
  album?: string;
  played_at?: string;
  last_played_at?: string;
  play_count?: number | string;
  distinct_days?: number | string;
  similarity?: number | string;
  track_image?: string | null;
  artist_image?: string | null;
};

type SearchResponse = {
  answer: string;
  results: SearchResult[];
  plan?: {
    entity: EntityType;
  };
};

const suggestions = [
  "What are my dreamy late-night songs?",
  "Which songs do I keep coming back to?",
  "What do I listen to on weekends?",
  "Which artists do I listen to the most?",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [entity, setEntity] = useState<EntityType>("track");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);

  async function handleSearch(e?: FormEvent) {
    e?.preventDefault();

    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setResults([]);
    setAuthRequired(false);

    try {
      const response = await fetch("/api/search/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      // Spotify connection is required.
      // Do NOT treat this as a normal search error.
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }

      const data: SearchResponse & { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setAnswer(data.answer || "");
      setResults(data.results || []);
      setEntity(data.plan?.entity || "track");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date?: string) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function shareInsight() {
    const shareText = `${query}\n\n${answer}\n\n— mellow`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Mellow insight",
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Insight copied to clipboard.");
      }
    } catch (err) {
      // User cancelled the native share sheet.
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        alert("Insight copied to clipboard.");
      } catch {
        console.error("Could not share insight:", err);
      }
    }
  }

  // Spotify authentication required.
  if (authRequired) {
    return <SpotifyAuth />;
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 md:px-8 md:py-24">
        {/* Header */}
        <section className="mb-16 md:mb-20">
          <div className="mb-6 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#c8ff00] shadow-[0_0_12px_#c8ff00]" />

            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
              Ask Mellow
            </span>
          </div>

          <h1 className="max-w-4xl text-5xl font-bold tracking-[-0.055em] md:text-7xl lg:text-8xl">
            Your music.
            <br />
            <span className="text-[#c8ff00]">Ask anything.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-relaxed text-white/40 md:text-lg">
            Search your listening history using natural language. Mellow finds
            the evidence and tells you what your music says.
          </p>
        </section>

        {/* Search box */}
        <section className="mb-14">
          <form onSubmit={handleSearch}>
            <div className="group relative border border-white/15 bg-white/[0.025] transition-colors focus-within:border-[#c8ff00]/50">
              <div className="flex items-center">
                <div className="pl-5 text-white/25">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Mellow about your music..."
                  className="min-w-0 flex-1 bg-transparent px-4 py-5 text-base outline-none placeholder:text-white/20 md:text-lg"
                />

                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center bg-[#c8ff00] text-black transition-all hover:shadow-[0_0_25px_rgba(200,255,0,0.2)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Suggestions */}
          {!answer && !loading && (
            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="border border-white/10 px-3 py-2 text-left text-xs text-white/40 transition-all hover:border-white/25 hover:text-white/80"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Loading */}
        {loading && (
          <section className="border-t border-white/10 pt-10">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8ff00]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8ff00] [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8ff00] [animation-delay:300ms]" />
              </div>

              <span className="text-xs uppercase tracking-[0.18em] text-white/30">
                Mellow is thinking
              </span>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="border border-red-400/20 bg-red-400/5 p-6">
            <p className="text-sm text-red-300">{error}</p>
          </section>
        )}

        {/* Answer */}
        {answer && !loading && (
          <div className="space-y-14">
            {/* AI answer */}
            <section className="border-t border-white/10 pt-10">
              <div className="mb-6 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#c8ff00]">
                  Mellow says
                </span>

                <span className="h-px w-12 bg-[#c8ff00]/30" />
              </div>

              <div
                className="
                  max-w-4xl
                  text-2xl
                  font-medium
                  leading-relaxed
                  tracking-[-0.02em]
                  md:text-4xl
                  [&_p]:mb-5
                  [&_p:last-child]:mb-0
                  [&_strong]:font-bold
                  [&_strong]:text-white
                  [&_em]:italic
                  [&_ul]:my-5
                  [&_ul]:list-disc
                  [&_ul]:pl-7
                  [&_ol]:my-5
                  [&_ol]:list-decimal
                  [&_ol]:pl-7
                  [&_li]:mb-2
                  [&_h1]:mb-5
                  [&_h1]:text-3xl
                  [&_h1]:font-bold
                  md:[&_h1]:text-5xl
                  [&_h2]:mb-4
                  [&_h2]:mt-8
                  [&_h2]:text-2xl
                  [&_h2]:font-bold
                  md:[&_h2]:text-4xl
                  [&_h3]:mb-3
                  [&_h3]:mt-6
                  [&_h3]:text-xl
                  [&_h3]:font-bold
                  [&_code]:bg-white/[0.06]
                  [&_code]:px-1.5
                  [&_code]:py-0.5
                  [&_code]:text-[0.85em]
                "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {answer}
                </ReactMarkdown>
              </div>
            </section>

            <section className="flex items-center justify-between border-t border-white/10 pt-6">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                Found in your listening history
              </span>

              <button
                onClick={shareInsight}
                className="flex items-center gap-2 border border-white/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/60 transition-all hover:border-[#c8ff00]/50 hover:text-[#c8ff00]"
              >
                Share insight

                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.6 13.5 6.8 4" />
                  <path d="m15.4 6.5-6.8 4" />
                </svg>
              </button>
            </section>

            {/* Evidence */}
            {results.length > 0 && (
              <section>
                <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                      Evidence
                    </span>

                    <h2 className="mt-2 text-xl font-bold tracking-tight">
                      From your listening history
                    </h2>
                  </div>

                  <span className="text-xs text-white/25">
                    {results.length} matches
                  </span>
                </div>

                <div className="divide-y divide-white/10">
                  {results.map((result, index) => (
                    <div
                      key={`${result.track || result.artist}-${result.artist}-${index}`}
                      className="group flex items-center gap-5 py-5"
                    >
                      {/* Number */}
                      <span className="w-6 shrink-0 text-xs text-white/20">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {/* Artwork */}
                      <div className="h-14 w-14 shrink-0 overflow-hidden bg-white/[0.06]">
                        {result.track_image ? (
                          <img
                            src={result.track_image}
                            alt={
                              result.track || result.artist || "Album artwork"
                            }
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : result.artist_image ? (
                          <img
                            src={result.artist_image}
                            alt={result.artist || "Artist"}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-lg text-white/20">♪</span>
                          </div>
                        )}
                      </div>

                      {/* Track / Artist */}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-white group-hover:text-[#c8ff00] md:text-base">
                          {entity === "artist"
                            ? result.artist || "Unknown artist"
                            : result.track || "Unknown track"}
                        </h3>

                        <p className="mt-1 truncate text-xs text-white/35">
                          {entity === "artist" ? (
                            `${result.play_count ?? 0} ${
                              Number(result.play_count) === 1
                                ? "play"
                                : "plays"
                            }`
                          ) : (
                            <>
                              {result.artist || "Unknown artist"}
                              {result.album ? ` · ${result.album}` : ""}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden shrink-0 text-right sm:block">
                        {result.play_count !== undefined && (
                          <p className="text-xs text-white/50">
                            {result.play_count}{" "}
                            {Number(result.play_count) === 1
                              ? "play"
                              : "plays"}
                          </p>
                        )}

                        {result.distinct_days !== undefined && (
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/20">
                            {result.distinct_days} days
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div className="hidden w-24 shrink-0 text-right md:block">
                        <span className="text-[10px] text-white/20">
                          {formatDate(
                            result.played_at || result.last_played_at
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* New search */}
            <section className="border-t border-white/10 pt-10">
              <button
                onClick={() => {
                  setAnswer("");
                  setResults([]);
                  setQuery("");
                  setEntity("track");
                }}
                className="text-xs uppercase tracking-[0.18em] text-white/35 transition-colors hover:text-[#c8ff00]"
              >
                ← Ask another question
              </button>
            </section>
          </div>
        )}

        {/* Empty state */}
        {!answer && !loading && !error && (
          <section className="mt-24 grid border-t border-white/10 pt-8 md:grid-cols-3 md:gap-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#c8ff00]">
                01
              </span>

              <h3 className="mt-3 font-semibold">Ask naturally</h3>

              <p className="mt-2 text-sm leading-relaxed text-white/30">
                No filters or complicated searches. Just ask Mellow.
              </p>
            </div>

            <div className="mt-8 md:mt-0">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#c8ff00]">
                02
              </span>

              <h3 className="mt-3 font-semibold">Find the pattern</h3>

              <p className="mt-2 text-sm leading-relaxed text-white/30">
                Mellow searches your actual listening history.
              </p>
            </div>

            <div className="mt-8 md:mt-0">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#c8ff00]">
                03
              </span>

              <h3 className="mt-3 font-semibold">Get the answer</h3>

              <p className="mt-2 text-sm leading-relaxed text-white/30">
                AI turns the evidence into something human.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}