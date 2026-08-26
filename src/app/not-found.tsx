import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="serif text-4xl">Not found</h1>
      <p className="mt-4 text-ink-soft">That Bill or article is not in this Katibaism instance.</p>
      <Link href="/analyse" className="mt-6 inline-block underline">
        Analyse a Bill
      </Link>
    </div>
  );
}
