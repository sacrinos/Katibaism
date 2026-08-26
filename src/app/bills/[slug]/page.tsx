import Link from "next/link";
import { notFound } from "next/navigation";
import { FindingCard } from "@/components/FindingCard";
import { Disclaimer } from "@/components/Disclaimer";
import { getBillBySlug } from "@/lib/store";
import { OVERALL_META, SEVERITY_META } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bill = await getBillBySlug(slug);
  return { title: bill?.title ?? "Bill" };
}

export default async function BillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bill = await getBillBySlug(slug);
  if (!bill) notFound();
  const overall = OVERALL_META[bill.summary.overall];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">Constitutional Risk Report</p>
      <h1 className="serif mt-3 max-w-4xl text-4xl leading-tight sm:text-5xl">{bill.title}</h1>
      <p className="mt-4 text-ink-soft">
        {bill.findings.length} constitutional questions detected
        {bill.billNumber ? ` · Bill No. ${bill.billNumber}` : ""}
        {bill.year ? ` · ${bill.year}` : ""}
        {bill.house ? ` · ${bill.house}` : ""}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="paper-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Overall assessment</p>
          <p className="serif mt-3 text-3xl">
            {overall.mark} {overall.label}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span>{SEVERITY_META.critical.mark} {bill.summary.critical} Critical</span>
            <span>{SEVERITY_META.high.mark} {bill.summary.high} High</span>
            <span>{SEVERITY_META.medium.mark} {bill.summary.medium} Medium</span>
            <span>{SEVERITY_META.low.mark} {bill.summary.low} Low</span>
          </div>
        </div>
        <div className="paper-card p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Constitutional Risk Index</p>
          <p className="serif mt-3 text-4xl">{bill.summary.riskIndex} / 100</p>
          <p className="mt-3 text-sm text-ink-soft">
            An analytical risk indicator, not a judicial determination. High scores mean
            scrutiny is recommended.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <a href={`/api/bills/${bill.id}/export?format=md`} className="underline">
          Export Markdown
        </a>
        <a href={`/api/bills/${bill.id}/export?format=json`} className="underline">
          Export JSON
        </a>
        <a href={`/api/bills/${bill.id}/export?format=csv`} className="underline">
          Export CSV
        </a>
        <Link href={`/bills/${bill.slug}/print`} className="underline">
          Print / PDF
        </Link>
      </div>

      <Disclaimer compact />

      {bill.classification.reasoning.length > 0 && (
        <section className="mt-12">
          <h2 className="serif text-3xl">Bill-level classification</h2>
          <ul className="mt-4 space-y-3 leading-7 text-ink-soft">
            {bill.classification.reasoning.map((reason) => (
              <li key={reason} className="paper-card p-4">
                {reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <h2 className="serif text-3xl">Clause map</h2>
        <div className="mt-5 overflow-x-auto paper-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper-deep text-xs uppercase tracking-[0.12em] text-ink-soft">
              <tr>
                <th className="px-4 py-3">Clause</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Constitutional questions</th>
              </tr>
            </thead>
            <tbody>
              {bill.clauses.map((clause) => {
                const related = bill.findings.filter((f) => f.clauseId === clause.id);
                return (
                  <tr key={clause.id} className="border-t border-rule align-top">
                    <td className="px-4 py-3 font-medium">{clause.clauseNumber}</td>
                    <td className="px-4 py-3">{clause.subject}</td>
                    <td className="px-4 py-3 text-ink-soft">{clause.operation}</td>
                    <td className="px-4 py-3">
                      {related.length
                        ? related.map((f) => (
                            <a key={f.id} href={`#finding-${f.id}`} className="mr-2 underline">
                              {SEVERITY_META[f.severity].mark} {f.citations[0]?.citation}
                            </a>
                          ))
                        : "None flagged"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="serif text-3xl">Constitutional map</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["Rights", ["art-24", "art-25", "art-27", "art-31", "art-33", "art-35", "art-40", "art-47", "art-50"]],
            ["Parliament", ["art-94", "art-110", "art-114", "art-118"]],
            ["Finance / institutions", ["art-201", "art-209", "art-210", "art-248", "art-249"]],
          ].map(([label, ids]) => {
            const present = bill.findings.filter((f) =>
              f.provisionIds.some((id) => (ids as string[]).includes(id)),
            );
            return (
              <div key={String(label)} className="paper-card p-5">
                <p className="serif text-xl">{label as string}</p>
                <p className="mt-2 text-sm text-ink-soft">
                  {present.length ? `${present.length} findings` : "No trigger in this Bill"}
                </p>
                <p className="mt-3 text-xs text-ink-soft">
                  {present
                    .flatMap((f) => f.citations.map((c) => c.citation))
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .join(" · ") || "—"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14 space-y-6">
        <h2 className="serif text-3xl">Findings</h2>
        {bill.findings.map((finding) => (
          <FindingCard key={finding.id} finding={finding} billId={bill.id} slug={bill.slug} />
        ))}
      </section>

      <section className="mt-16 paper-card p-6 text-sm text-ink-soft">
        <p>
          Analysis recorded against {bill.versions.constitutionVersion}, rules {bill.versions.rulesVersion},
          model {bill.versions.analysisModel}, at {bill.versions.timestamp}.
        </p>
      </section>
    </div>
  );
}
