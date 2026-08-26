import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-rule bg-[#efe6d4]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink-soft sm:flex-row sm:justify-between">
        <p className="max-w-xl">
          Katibaism tests legislation against the Constitution of Kenya, 2010. It is not a
          court and does not give legal advice. Canonical constitutional text:{" "}
          <a
            className="underline decoration-kenya-red/40 underline-offset-3 hover:text-ink"
            href="https://new.kenyalaw.org/akn/ke/act/2010/constitution"
            target="_blank"
            rel="noreferrer"
          >
            Kenya Law
          </a>
          .
        </p>
        <div className="flex gap-5">
          <Link href="/methodology">Methodology</Link>
          <Link href="/dashboard">Public reports</Link>
        </div>
      </div>
    </footer>
  );
}
