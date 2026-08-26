import type {
  BillClassification,
  BillRecord,
  BillStatus,
  Clause,
  DashboardStats,
  Finding,
  FindingFeedback,
  InputMethod,
  AnalysisVersions,
  RiskSummary,
} from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type BillRow = Database["public"]["Tables"]["bills"]["Row"];
type FindingRow = Database["public"]["Tables"]["findings"]["Row"];

function toIso(value: string): string {
  return new Date(value).toISOString();
}

export function billRowToRecord(row: BillRow, findings: Finding[]): BillRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    billNumber: row.bill_number,
    year: row.year,
    house: row.house,
    sponsor: row.sponsor,
    sourceUrl: row.source_url,
    inputMethod: row.input_method as InputMethod,
    originalFilename: row.original_filename,
    rawText: row.raw_text,
    explanatoryMemorandum: row.explanatory_memorandum,
    clauses: row.clauses as Clause[],
    findings,
    classification: row.classification as BillClassification,
    summary: row.summary as RiskSummary,
    versions: row.versions as AnalysisVersions,
    status: row.status as BillStatus,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    error: row.error ?? undefined,
  };
}

export function findingRowToFinding(row: FindingRow): Finding {
  return {
    id: row.id,
    clauseId: row.clause_id,
    clauseNumber: row.clause_number,
    clauseText: row.clause_text,
    issueType: row.issue_type as Finding["issueType"],
    title: row.title,
    whatItDoes: row.what_it_does,
    whyItMatters: row.why_it_matters,
    citizenExplanation: row.citizen_explanation,
    legalExplanation: row.legal_explanation,
    counterargument: row.counterargument,
    whatToInvestigate: row.what_to_investigate,
    severity: row.severity as Finding["severity"],
    confidence: row.confidence as Finding["confidence"],
    confidenceScore: Number(row.confidence_score),
    provisionIds: row.provision_ids as string[],
    citations: row.citations as Finding["citations"],
    triggeringLanguage: row.triggering_language as string[],
    concepts: row.concepts as string[],
    rulesTriggered: row.rules_triggered as string[],
    humanReviewRecommended: row.human_review_recommended,
    whyFlagged: row.why_flagged as Finding["whyFlagged"],
    feedback: (row.feedback as FindingFeedback | null) ?? undefined,
  };
}

export function billRecordToRow(bill: BillRecord): Database["public"]["Tables"]["bills"]["Insert"] {
  return {
    id: bill.id,
    slug: bill.slug,
    title: bill.title,
    bill_number: bill.billNumber,
    year: bill.year,
    house: bill.house,
    sponsor: bill.sponsor,
    source_url: bill.sourceUrl,
    input_method: bill.inputMethod,
    original_filename: bill.originalFilename,
    raw_text: bill.rawText,
    explanatory_memorandum: bill.explanatoryMemorandum,
    clauses: bill.clauses,
    classification: bill.classification,
    summary: bill.summary,
    versions: bill.versions,
    status: bill.status,
    error: bill.error ?? null,
    created_at: bill.createdAt,
    updated_at: bill.updatedAt,
  };
}

export function findingToRow(finding: Finding, billId: string): Database["public"]["Tables"]["findings"]["Insert"] {
  return {
    id: finding.id,
    bill_id: billId,
    clause_id: finding.clauseId,
    clause_number: finding.clauseNumber,
    clause_text: finding.clauseText,
    issue_type: finding.issueType,
    title: finding.title,
    what_it_does: finding.whatItDoes,
    why_it_matters: finding.whyItMatters,
    citizen_explanation: finding.citizenExplanation,
    legal_explanation: finding.legalExplanation,
    counterargument: finding.counterargument,
    what_to_investigate: finding.whatToInvestigate,
    severity: finding.severity,
    confidence: finding.confidence,
    confidence_score: finding.confidenceScore,
    provision_ids: finding.provisionIds,
    citations: finding.citations,
    triggering_language: finding.triggeringLanguage,
    concepts: finding.concepts,
    rules_triggered: finding.rulesTriggered,
    why_flagged: finding.whyFlagged,
    human_review_recommended: finding.humanReviewRecommended,
    feedback: finding.feedback ?? null,
  };
}

export function dashboardJsonToStats(value: unknown): DashboardStats {
  const stats = value as DashboardStats;
  return {
    billsAnalysed: stats.billsAnalysed ?? 0,
    criticalFindings: stats.criticalFindings ?? 0,
    highRiskClauses: stats.highRiskClauses ?? 0,
    topArticles: stats.topArticles ?? [],
    recent: stats.recent ?? [],
  };
}
