import Nav from "./components/Nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-hidden selection:bg-[#c8ff00] selection:text-black">
      <Nav />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        {/* HERO */}
        <section className="min-h-[calc(100vh-72px)] flex flex-col justify-between py-8 md:py-12">
          {/* Top metadata */}
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/35">
            <span>MELLOW / 001</span>

            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" />
              <span>Music intelligence</span>
            </div>
          </div>

          {/* Main hero */}
          <div className="relative py-20 md:py-24">
            {/* Glow */}
            <div className="absolute -left-32 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#c8ff00]/5 blur-[140px] rounded-full pointer-events-none" />

            <div className="relative z-10">
              <p className="text-xs md:text-sm text-white/35 uppercase tracking-[0.3em] mb-7">
                Your music has a personality.
              </p>

              <h1 className="text-[21vw] md:text-[16vw] lg:text-[13vw] leading-[0.72] tracking-[-0.075em] font-bold">
                mellow
              </h1>

              <div className="mt-10 md:mt-12 flex flex-col md:flex-row md:items-end justify-between gap-10">
                <p className="text-xl md:text-3xl text-white/70 leading-tight max-w-xl tracking-tight">
                  Your listening history knows more about you
                  <span className="text-[#c8ff00]"> than you think.</span>
                </p>

                <div className="hidden md:block text-right text-xs text-white/25 uppercase tracking-widest leading-loose">
                  <p>listen</p>
                  <p>discover</p>
                  <p>understand</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-xs text-white/35">
              <span className="w-2 h-2 rounded-full bg-[#c8ff00]" />
              <span>Private · Read-only Spotify access</span>
            </div>

            <a
              href="/api/auth/login"
              className="group inline-flex items-center justify-between gap-10 bg-[#c8ff00] text-black px-6 py-4 text-xs font-bold uppercase tracking-[0.18em] hover:bg-white transition-colors"
            >
              Connect Spotify
              <span className="text-lg group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                ↗
              </span>
            </a>
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-white/10 py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-5">
                Explore your music
              </p>

              <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.06em] leading-[0.85]">
                Go deeper.
              </h2>
            </div>

            <p className="max-w-sm text-sm text-white/40 leading-relaxed">
              Mellow turns your listening history into something you can
              actually understand.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
            <Feature
              number="01"
              title="Persona"
              description="The personality hiding inside your listening habits."
              href="/persona"
              accent
            />

            <Feature
              number="02"
              title="Through Time"
              description="Watch your taste evolve as Mellow collects your history."
              href="/history"
            />

            <Feature
              number="03"
              title="Patterns"
              description="Discover the habits and behaviors hiding in your listening history."
              href="/patterns"
            />

            <Feature
              number="04"
              title="Why this?"
              description="Find out why a song fits your taste using your actual listening history."
              href="/why"
            />

            <Feature
              number="05"
              title="Ask Mellow"
              description="Ask anything about your own listening history."
              href="/search"
              accent
            />
          </div>
        </section>

        {/* BIG STATEMENT */}
        <section className="relative py-32 md:py-48 border-t border-white/10 overflow-hidden">
          <div className="absolute right-[-15%] top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-[#c8ff00]/10 pointer-events-none" />

          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/25 mb-10">
              The idea
            </p>

            <h2 className="text-5xl md:text-7xl lg:text-[8vw] font-bold leading-[0.82] tracking-[-0.07em] max-w-6xl">
              You listen.
              <br />
              <span className="text-white/25">Mellow</span>{" "}
              <span className="text-[#c8ff00]">listens back.</span>
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

function Feature({
  number,
  title,
  description,
  href,
  accent = false,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <a
      href={href}
      className={`group relative min-h-[280px] p-7 md:p-10 flex flex-col justify-between overflow-hidden transition-colors duration-300 ${
        accent
          ? "bg-[#0d0d0d] hover:bg-[#111]"
          : "bg-[#080808] hover:bg-[#0d0d0d]"
      }`}
    >
      {/* Hover glow */}
      <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-[#c8ff00]/0 group-hover:bg-[#c8ff00]/5 blur-[70px] rounded-full transition-all duration-500" />

      <div className="relative z-10 flex justify-between items-start">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/25">
          {number}
        </span>

        {accent && (
          <span className="w-2 h-2 rounded-full bg-[#c8ff00] shadow-[0_0_12px_#c8ff00]" />
        )}
      </div>

      <div className="relative z-10">
        <h3 className="text-4xl md:text-5xl font-bold tracking-[-0.05em] group-hover:text-[#c8ff00] transition-colors">
          {title}
        </h3>

        <div className="flex items-end justify-between gap-6 mt-5">
          <p className="text-sm text-white/35 leading-relaxed max-w-xs">
            {description}
          </p>

          <span className="text-xl text-white/30 group-hover:text-[#c8ff00] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
            ↗
          </span>
        </div>
      </div>
    </a>
  );
}
