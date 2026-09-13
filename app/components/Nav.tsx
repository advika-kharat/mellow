export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080808]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-8">
        {/* LOGO */}
        <a href="/" className="group flex items-center gap-3">
          <span className="text-2xl md:text-3xl font-bold tracking-[-0.07em] text-white transition-colors group-hover:text-[#c8ff00]">
            mellow
          </span>

          <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-[#c8ff00] shadow-[0_0_10px_#c8ff00]" />
        </a>

        {/* NAVIGATION */}
        <div className="flex items-center gap-1 md:gap-2">
          <NavLink href="/persona">Persona</NavLink>

          <NavLink href="/history">Through Time</NavLink>

          <NavLink href="/patterns">Patterns</NavLink>

          <NavLink href="/why">Why this?</NavLink>

          <NavLink href="/search">Ask Mellow</NavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="
        relative
        px-3 py-2
        md:px-4
        text-[10px] md:text-xs
        uppercase
        tracking-[0.12em]
        text-white/40
        transition-colors
        hover:text-white
        group
      "
    >
      {children}

      <span
        className="
          absolute
          left-3 right-3 md:left-4 md:right-4
          bottom-0
          h-px
          bg-[#c8ff00]
          scale-x-0
          origin-left
          transition-transform
          duration-300
          group-hover:scale-x-100
        "
      />
    </a>
  );
}
