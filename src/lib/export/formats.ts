import type { BillRecord } from "@/lib/types";

export function toMarkdown(bill: BillRecord): string {
  const lines = [
    `# ${bill.title}`,
    "",
    `> Katibaism constitutional risk report. This is not a judicial determination.`,
    "",
    `**Overall:** ${bill.summary.label}`,
    `**Constitutional Risk Index:** ${bill.summary.riskIndex} / 100`,
    `**Findings:** ${bill.findings.length}`,
    `**Constitution version:** ${bill.versions.constitutionVersion}`,
    `**Rules version:** ${bill.versions.rulesVersion}`,
    `**Analysed:** ${bill.versions.timestamp}`,
    "",
    "## Executive summary",
    "",
    `- Critical: ${bill.summary.critical}`,
    `- High: ${bill.summary.high}`,
    `- Medium: ${bill.summary.medium}`,
    `- Low: ${bill.summary.low}`,
    "",
    "## Bill metadata",
    "",
    `- Number: ${bill.billNumber ?? "—"}`,
    `- Year: ${bill.year ?? "—"}`,
    `- House: ${bill.house ?? "—"}`,
    `- Sponsor: ${bill.sponsor ?? "—"}`,
    "",
    "## Classification",
    "",
    ...bill.classification.reasoning.map((r) => `- ${r}`),
    "",
    "## Findings",
    "",
  ];

  for (const finding of bill.findings) {
    lines.push(
      `### Clause ${finding.clauseNumber} — ${finding.title}`,
      "",
      `**Severity:** ${finding.severity} · **Confidence:** ${finding.confidence} (${finding.confidenceScore}%)`,
      "",
      "**What it does**",
      "",
      finding.whatItDoes,
      "",
      "**Why it matters**",
      "",
      finding.whyItMatters,
      "",
      "**Legal view**",
      "",
      finding.legalExplanation,
      "",
      "**Citizen view**",
      "",
      finding.citizenExplanation,
      "",
      "**Counterargument**",
      "",
      finding.counterargument,
      "",
      "**What to investigate**",
      "",
      finding.whatToInvestigate,
      "",
      "**Citations**",
      "",
      ...finding.citations.map((c) => `- ${c.citation} — ${c.title}: ${c.quotedText}`),
      "",
      "**Bill text**",
      "",
      `> ${finding.clauseText}`,
      "",
    );
    if (finding.article24Test) {
      lines.push(
        "**Article 24 Test B**",
        "",
        finding.article24Test.summary,
        "",
        ...finding.article24Test.questions.map(
          (q, i) =>
            `${i + 1}. ${q.question} (${q.articleAnchor}) — **${q.finding}**. ${q.note}${q.evidence ? ` Evidence: ${q.evidence}` : ""}`,
        ),
        "",
      );
    }
  }

  lines.push(
    "## Methodology",
    "",
    "Katibaism does not ask an LLM whether a Bill is constitutional.",
    "It retrieves the Constitution of Kenya, 2010 from a versioned knowledge base,",
    "runs deterministic constitutional tests, optionally uses an LLM only as a reasoning layer,",
    "and rejects any finding whose citations cannot be verified against that knowledge base.",
    "",
    "## Disclaimer",
    "",
    "Katibaism is constitutional intelligence, not a court and not legal advice.",
    "It surfaces questions and evidence. Human legal review is recommended for high-risk findings.",
    "",
  );
  return lines.join("\n");
}

export function toCsv(bill: BillRecord): string {
  const header = [
    "clause",
    "severity",
    "confidence",
    "confidence_score",
    "issue_type",
    "title",
    "citations",
    "what_it_does",
    "counterargument",
  ];
  const rows = bill.findings.map((f) =>
    [
      f.clauseNumber,
      f.severity,
      f.confidence,
      f.confidenceScore,
      f.issueType,
      csv(f.title),
      csv(f.citations.map((c) => c.citation).join("; ")),
      csv(f.whatItDoes),
      csv(f.counterargument),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
