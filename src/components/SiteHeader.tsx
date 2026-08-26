import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-[#fffaf1]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="serif text-xl tracking-tight text-ink">Katibaism</span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-soft sm:inline">
            Constitutional intelligence
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-ink-soft">
          <Link href="/analyse" className="hover:text-ink">
            Analyse a Bill
          </Link>
          <Link href="/dashboard" className="hover:text-ink">
            Dashboard
          </Link>
          <Link href="/methodology" className="hover:text-ink">
            Method
          </Link>
        </nav>
      </div>
    </header>
  );
}
