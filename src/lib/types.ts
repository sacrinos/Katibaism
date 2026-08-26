export type Severity = "critical" | "high" | "medium" | "low";
export type ConfidenceLabel = "high" | "medium" | "low";
export type BillStatus = "uploaded" | "parsed" | "analysed" | "failed";
export type InputMethod = "upload" | "paste" | "url" | "sample";

export type IssueType =
  | "direct_conflict"
  | "rights_limitation"
  | "delegated_legislation"
  | "legislative_procedure"
  | "public_participation"
  | "taxation_public_money"
  | "institutional_power"
  | "separation_of_powers"
  | "constitutional_institution"
  | "property_economic"
  | "equality"
  | "administrative_justice"
  | "offences_penalties"
  | "hidden_issue"
  | "escape_hatch"
  | "system_level";

export interface ConstitutionSource {
  publisher: string;
  instrument: string;
  url: string;
  version: string;
}

export interface ConstitutionProvision {
  id: string;
  kind: "article" | "schedule";
  article: number | null;
  subsection: string | null;
  citation: string;
  title: string;
  chapter: number | null;
  chapter_title: string | null;
  part: string | null;
  text: string;
  concepts: string[];
  tags: string[];
  source: ConstitutionSource;
}

export interface ConstitutionKnowledgeBase {
  version: string;
  instrument: string;
  canonical_source: string;
  publisher: string;
  published: string;
  commenced: string;
  assented: string;
  notes: string[];
  provisions: ConstitutionProvision[];
}

export interface OntologyMapping {
  id: string;
  concept: string;
  provision_ids: string[];
  phrases: string[];
}

export interface Clause {
  id: string;
  clauseNumber: string;
  heading: string;
  text: string;
  position: number;
  subject: string;
  operation: string;
}

export interface Citation {
  provisionId: string;
  citation: string;
  title: string;
  quotedText: string;
  verified: boolean;
}

export interface WhyFlagged {
  triggeringLanguage: string[];
  concept: string;
  retrievedProvisions: string[];
  rulesTriggered: string[];
  reasoning: string;
  counterargument: string;
  confidence: number;
}

export interface Finding {
  id: string;
  clauseId: string;
  clauseNumber: string;
  clauseText: string;
  issueType: IssueType;
  title: string;
  whatItDoes: string;
  whyItMatters: string;
  citizenExplanation: string;
  legalExplanation: string;
  counterargument: string;
  whatToInvestigate: string;
  severity: Severity;
  confidence: ConfidenceLabel;
  confidenceScore: number;
  provisionIds: string[];
  citations: Citation[];
  triggeringLanguage: string[];
  concepts: string[];
  rulesTriggered: string[];
  humanReviewRecommended: boolean;
  whyFlagged: WhyFlagged;
  feedback?: FindingFeedback;
}

export interface FindingFeedback {
  kind: "correct" | "false_positive" | "missing_context" | "wrong_provision" | "other";
  note?: string;
  createdAt: string;
}

export interface MoneyClassification {
  taxes: string[];
  levies: string[];
  fees: string[];
  charges: string[];
  appropriations: string[];
  loans: string[];
  guarantees: string[];
  funds: string[];
}

export interface BillClassification {
  possibleMoneyBill: boolean;
  possibleCountyBill: boolean;
  possibleConstitutionalAmendment: boolean;
  senateParticipationPossible: boolean;
  publicParticipationImplicated: boolean;
  money: MoneyClassification;
  reasoning: string[];
}

export interface AnalysisVersions {
  constitutionVersion: string;
  analysisModel: string;
  analysisPromptVersion: string;
  rulesVersion: string;
  knowledgeBaseVersion: string;
  timestamp: string;
}

export interface RiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  riskIndex: number;
  overall: "none" | "question" | "concern" | "conflict";
  label: string;
}

export interface BillRecord {
  id: string;
  slug: string;
  title: string;
  billNumber: string | null;
  year: string | null;
  house: string | null;
  sponsor: string | null;
  sourceUrl: string | null;
  inputMethod: InputMethod;
  originalFilename: string | null;
  rawText: string;
  explanatoryMemorandum: string | null;
  clauses: Clause[];
  findings: Finding[];
  classification: BillClassification;
  summary: RiskSummary;
  versions: AnalysisVersions;
  status: BillStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface DashboardStats {
  billsAnalysed: number;
  criticalFindings: number;
  highRiskClauses: number;
  topArticles: { citation: string; count: number }[];
  recent: Pick<BillRecord, "id" | "slug" | "title" | "summary" | "createdAt" | "status">[];
}
