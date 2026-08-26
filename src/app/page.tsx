import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="bg-ink text-paper hero-grid">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.28em] text-[#e7dcc8]">Kenya · Constitution of 2010</p>
          <h1 className="serif mt-5 max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Katibaism</h1>
          <p className="serif mt-6 max-w-2xl text-2xl italic text-[#e7dcc8] sm:text-3xl">
            Put every Bill against the Constitution.
          </p>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#d8cbb3]">
            Upload a proposed Kenyan Bill. Katibaism reads it clause by clause and identifies
            provisions that may conflict with the Constitution of Kenya, 2010.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/analyse"
              className="rounded-md bg-kenya-red px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white"
            >
              Analyse a Bill
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-[#d8cbb3] px-6 py-3 text-sm uppercase tracking-[0.14em] text-paper"
            >
              Explore reports
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3">
        {[
          ["Every Bill.", "PDF, Word, pasted text, or an official Parliament URL."],
          ["Every Clause.", "A clause map, not a summary. Findings attach to exact provisions."],
          ["Against the Constitution.", "The Constitution is the source of truth. The AI only reasons over retrieved text."],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 className="serif text-3xl">{title}</h2>
            <p className="mt-3 leading-7 text-ink-soft">{body}</p>
          </div>
        ))}
      </section>

      <section className="border-y border-rule bg-[#fffaf1]">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">The test</p>
          <h2 className="serif mt-3 max-w-3xl text-4xl leading-tight">
            Do not ask whether a Bill sounds good. Ask whether every provision survives the Constitution.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["What is wrong?", "Severity, not slogans."],
              ["Where is it?", "The exact clause."],
              ["What does the Constitution say?", "Cited, verifiable text."],
              ["What is the counterargument?", "Both sides, always."],
            ].map(([q, a]) => (
              <div key={q} className="paper-card p-5">
                <p className="serif text-xl">{q}</p>
                <p className="mt-2 text-sm text-ink-soft">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
