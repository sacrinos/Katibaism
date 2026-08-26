import Link from "next/link";
import { notFound } from "next/navigation";
import { getProvision } from "@/lib/constitution/load";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = getProvision(id);
  return { title: provision ? provision.citation : "Constitution" };
}

export default async function ConstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provision = getProvision(id);
  if (!provision) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
        Constitution of Kenya, 2010 · {provision.source.version}
      </p>
      <h1 className="serif mt-3 text-4xl">
        {provision.citation} — {provision.title}
      </h1>
      {provision.chapter_title && (
        <p className="mt-3 text-ink-soft">
          Chapter {provision.chapter} · {provision.chapter_title}
          {provision.part ? ` · ${provision.part}` : ""}
        </p>
      )}
      <article className="paper-card mt-8 p-6 text-lg leading-8">{provision.text}</article>
      <p className="mt-6 text-sm text-ink-soft">
        Canonical source:{" "}
        <a className="underline" href={provision.source.url} target="_blank" rel="noreferrer">
          {provision.source.publisher}
        </a>
      </p>
      <Link href="/analyse" className="mt-8 inline-block underline">
        Analyse a Bill
      </Link>
    </div>
  );
}
