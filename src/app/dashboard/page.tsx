import Link from "next/link";
import { dashboardStats } from "@/lib/store";
import { OVERALL_META } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const stats = await dashboardStats();
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">Watch Parliament · later</p>
      <h1 className="serif mt-2 text-5xl">Reports</h1>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ["Bills analysed", stats.billsAnalysed],
          ["Critical findings", stats.criticalFindings],
          ["High-risk clauses", stats.highRiskClauses],
        ].map(([label, value]) => (
          <div key={String(label)} className="paper-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">{label}</p>
            <p className="serif mt-2 text-4xl">{value}</p>
          </div>
        ))}
      </div>

      {stats.topArticles.length > 0 && (
        <div className="mt-10">
          <h2 className="serif text-2xl">Articles most frequently triggered</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {stats.topArticles.map((a) => (
              <li key={a.citation} className="rounded-full bg-paper-deep px-4 py-1 text-sm">
                {a.citation} · {a.count}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 space-y-4">
        {stats.recent.length === 0 ? (
          <p className="text-ink-soft">
            No Bills yet.{" "}
            <Link href="/analyse" className="underline">
              Analyse the first one.
            </Link>
          </p>
        ) : (
          stats.recent.map((bill) => (
            <Link key={bill.id} href={`/bills/${bill.slug}`} className="paper-card block p-5 hover:border-ink">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="serif text-2xl">{bill.title}</h3>
                <span className="text-sm text-ink-soft">
                  {OVERALL_META[bill.summary.overall].mark} {bill.summary.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">
                Risk index {bill.summary.riskIndex}/100 · {new Date(bill.createdAt).toLocaleString()}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
