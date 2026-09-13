export default function SpotifyAuth() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/30">
          Mellow
        </p>

        <h1 className="text-3xl font-semibold text-white">
          Connect your Spotify
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm text-white/40">
          Connect Spotify to unlock your listening history and personal music
          insights.
        </p>

        <a
          href="/api/auth/login"
          className="mt-8 inline-flex rounded-full bg-[#c8ff00] px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-105"
        >
          Connect Spotify
        </a>
      </div>
    </main>
  );
}