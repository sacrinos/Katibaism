"use client";

import Link from "next/link";
import { useState } from "react";
import { SEVERITY_META } from "@/lib/labels";
import type { Finding } from "@/lib/types";

export function FindingCard({
  finding,
  billId,
  slug,
  siteUrl,
}: {
  finding: Finding;
  billId: string;
  slug: string;
  siteUrl: string;
}) {
  const [view, setView] = useState<"citizen" | "legal">("citizen");
  const [open, setOpen] = useState(false);
  const [compare, setCompare] = useState(false);
  const [feedback, setFeedback] = useState(finding.feedback?.kind);
  const meta = SEVERITY_META[finding.severity];

  async function disagree(kind: NonNullable<typeof feedback>) {
    setFeedback(kind);
    await fetch(`/api/bills/${billId}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ findingId: finding.id, kind }),
    });
  }

  const reportUrl = `${siteUrl.replace(/\/$/, "")}/bills/${slug}`;
  const shareText = encodeURIComponent(
    `KATIBAISM — Clause ${finding.clauseNumber} raises a potential ${finding.citations[0]?.citation} issue.\n\n${finding.citizenExplanation}\n\n${reportUrl}`,
  );

  return (
    <article id={`finding-${finding.id}`} className="paper-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
            Clause {finding.clauseNumber} · {finding.issueType.replace(/_/g, " ")}
          </p>
          <h3 className="serif mt-1 text-2xl leading-tight">{finding.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-3 py-1 font-medium ${meta.className}`}>
            {meta.mark} {meta.label}
          </span>
          <span className="rounded-full bg-paper-deep px-3 py-1">
            Confidence {finding.confidence} · {finding.confidenceScore}%
          </span>
        </div>
      </div>

      <p className="mt-4 text-ink-soft">{finding.whatItDoes}</p>

      <div className="mt-5 flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setView("citizen")}
          className={`rounded-full px-3 py-1 ${view === "citizen" ? "bg-ink text-paper" : "bg-paper-deep"}`}
        >
          Citizen view
        </button>
        <button
          type="button"
          onClick={() => setView("legal")}
          className={`rounded-full px-3 py-1 ${view === "legal" ? "bg-ink text-paper" : "bg-paper-deep"}`}
        >
          Legal view
        </button>
      </div>
      <p className="mt-3 leading-7">
        {view === "citizen" ? finding.citizenExplanation : finding.legalExplanation}
      </p>

      <div className="mt-5 border-t border-rule pt-4">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Why this matters</p>
        <p className="mt-2 leading-7">{finding.whyItMatters}</p>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Relevant Constitution</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {finding.citations.map((c) => (
            <Link
              key={c.provisionId}
              href={`/constitution/${c.provisionId}`}
              className="rounded-full border border-rule px-3 py-1 text-sm hover:border-ink"
            >
              Open {c.citation}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-md bg-[#f4eee0] p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Counterargument</p>
        <p className="mt-2 leading-7">{finding.counterargument}</p>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        <span className="font-medium text-ink">What to investigate: </span>
        {finding.whatToInvestigate}
      </p>
      {finding.humanReviewRecommended && (
        <p className="mt-2 text-sm font-medium text-kenya-red">Human legal review recommended.</p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <button type="button" onClick={() => setCompare((v) => !v)} className="border-b border-ink">
          {compare ? "Hide comparison" : "Show clause / Show Constitution"}
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="border-b border-ink">
          {open ? "Hide audit trail" : "Why did you flag this?"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noreferrer"
          className="border-b border-ink"
        >
          Share
        </a>
      </div>

      {compare && (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-rule bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Bill · Clause {finding.clauseNumber}</p>
            <p className="mt-3 text-sm leading-7">{finding.clauseText}</p>
          </div>
          <div className="rounded-md border border-rule bg-white p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
              Constitution · {finding.citations[0]?.citation}
            </p>
            <p className="mt-3 text-sm leading-7">{finding.citations[0]?.quotedText}</p>
          </div>
        </div>
      )}

      {open && (
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-soft">
          <li>Triggering language: {finding.whyFlagged.triggeringLanguage.join(" · ")}</li>
          <li>Concept: {finding.whyFlagged.concept}</li>
          <li>Retrieved: {finding.whyFlagged.retrievedProvisions.join(", ")}</li>
          <li>Rule: {finding.whyFlagged.rulesTriggered.join(", ")}</li>
          <li>Reasoning: {finding.whyFlagged.reasoning}</li>
          <li>Counterargument: {finding.whyFlagged.counterargument}</li>
          <li>Confidence: {finding.whyFlagged.confidence}%</li>
        </ol>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <span className="self-center text-ink-soft">I disagree:</span>
        {(
          [
            ["correct", "Correct"],
            ["false_positive", "False positive"],
            ["missing_context", "Missing context"],
            ["wrong_provision", "Wrong provision"],
            ["other", "Other"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => disagree(kind)}
            className={`rounded-full border px-3 py-1 ${
              feedback === kind ? "border-ink bg-ink text-paper" : "border-rule"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}
