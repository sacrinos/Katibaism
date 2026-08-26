import { constitutionVersion } from "@/lib/constitution/load";
import { retrieveForClause } from "@/lib/constitution/retrieve";
import { verifyFindings } from "@/lib/constitution/verify";
import {
  RULES_VERSION,
  classifyBill,
  detectEscapeHatches,
  detectParticipationGap,
  hitsToFindings,
  runClauseRules,
} from "@/lib/rules/engine";
import { enhanceWithLlm } from "@/lib/analysis/llm";
import type {
  AnalysisVersions,
  BillRecord,
  Clause,
  Finding,
  RiskSummary,
} from "@/lib/types";

export const PROMPT_VERSION = "prompt.v1";

function scoreSummary(findings: Finding[]): RiskSummary {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;
  const riskIndex = Math.min(
    100,
    critical * 28 + high * 12 + medium * 5 + low * 2,
  );
  let overall: RiskSummary["overall"] = "none";
  let label = "No significant constitutional issue detected";
  if (critical > 0) {
    overall = "conflict";
    label = "Serious potential constitutional conflict";
  } else if (high > 0) {
    overall = "concern";
    label = "Significant constitutional concern";
  } else if (medium > 0) {
    overall = "question";
    label = "Constitutional question / requires review";
  }
  return { critical, high, medium, low, riskIndex, overall, label };
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const finding of findings) {
    const key = `${finding.clauseId}:${finding.rulesTriggered.join(",")}:${finding.issueType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(finding);
  }
  return out;
}

function adversarialFilter(findings: Finding[]): Finding[] {
  return findings.filter((finding) => {
    if (finding.issueType === "institutional_power" && finding.severity === "low") {
      const siblings = findings.filter(
        (f) =>
          f.clauseId === finding.clauseId &&
          f.id !== finding.id &&
          (f.issueType === "delegated_legislation" ||
            f.issueType === "administrative_justice" ||
            f.issueType === "taxation_public_money"),
      );
      if (siblings.length) return false;
    }
    return true;
  });
}

function attachRetrieval(clause: Clause, findings: Finding[]): Finding[] {
  return findings.map((finding) => {
    const extra = retrieveForClause(clause.text, finding.provisionIds);
    const extraIds = extra
      .map((h) => h.provision.id)
      .filter((id) => !finding.provisionIds.includes(id))
      .slice(0, 2);
    return {
      ...finding,
      whyFlagged: {
        ...finding.whyFlagged,
        retrievedProvisions: [
          ...finding.whyFlagged.retrievedProvisions,
          ...extra.filter((h) => extraIds.includes(h.provision.id)).map((h) => h.provision.citation),
        ],
      },
    };
  });
}

export async function analyseClauses(
  clauses: Clause[],
  rawText: string,
): Promise<{
  findings: Finding[];
  classification: ReturnType<typeof classifyBill>;
  summary: RiskSummary;
  versions: AnalysisVersions;
  rejectedCitations: string[];
}> {
  const classification = classifyBill(clauses, rawText);
  let findings: Finding[] = [];

  for (const clause of clauses) {
    const hits = runClauseRules(clause);
    findings.push(...attachRetrieval(clause, hitsToFindings(clause, hits)));
  }

  const systemHits = [
    ...detectEscapeHatches(clauses),
    ...detectParticipationGap(clauses, classification),
  ];
  if (systemHits.length && clauses[0]) {
    findings.push(...hitsToFindings(clauses[0], systemHits));
  }

  findings = dedupeFindings(findings);
  findings = adversarialFilter(findings);
  findings = await enhanceWithLlm(clauses, findings);

  const { kept, rejected } = verifyFindings(findings);
  kept.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return rank[a.severity] - rank[b.severity] || b.confidenceScore - a.confidenceScore;
  });

  return {
    findings: kept,
    classification,
    summary: scoreSummary(kept),
    versions: {
      constitutionVersion: constitutionVersion(),
      analysisModel: process.env.KATIBAISM_MODEL || "deterministic-rules.v1",
      analysisPromptVersion: PROMPT_VERSION,
      rulesVersion: RULES_VERSION,
      knowledgeBaseVersion: constitutionVersion(),
      timestamp: new Date().toISOString(),
    },
    rejectedCitations: rejected,
  };
}

export function applyAnalysis(bill: BillRecord, analysis: Awaited<ReturnType<typeof analyseClauses>>): BillRecord {
  return {
    ...bill,
    findings: analysis.findings,
    classification: analysis.classification,
    summary: analysis.summary,
    versions: analysis.versions,
    status: "analysed",
    updatedAt: new Date().toISOString(),
  };
}
