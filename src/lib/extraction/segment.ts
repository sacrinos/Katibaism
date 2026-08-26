import { nanoid } from "nanoid";
import type { Clause } from "@/lib/types";

const MARGINALS = [
  "Short title",
  "Interpretation",
  "Application",
  "Object",
  "Objects",
  "Purpose",
  "Establishment",
  "Functions",
  "Powers",
  "Regulations",
  "Rules",
  "Offences",
  "Penalties",
  "Repeal",
  "Savings",
  "Transition",
  "Commencement",
  "Exemption",
];

export interface BillMetadata {
  title: string;
  billNumber: string | null;
  year: string | null;
  house: string | null;
  sponsor: string | null;
  explanatoryMemorandum: string | null;
}

export function extractMetadata(text: string): BillMetadata {
  const compact = text.replace(/\r/g, "");
  const titleMatch =
    compact.match(/THE\s+([A-Z][A-Z0-9 ,'"()-]{8,}?BILL(?:,?\s+\d{4})?)/i) ||
    compact.match(/^(.+Bill(?:,?\s+\d{4})?)/im);
  const yearMatch = compact.match(/\b(20\d{2})\b/);
  const numberMatch = compact.match(
    /(?:Bill\s+No\.?\s*|National Assembly Bills?\s+No\.?\s*|Senate Bills?\s+No\.?\s*)(\d+\s+of\s+\d{4}|\d+)/i,
  );
  const houseMatch = compact.match(/\b(National Assembly|Senate)\b/i);
  const sponsorMatch = compact.match(
    /(?:sponsored by|introduced by|published by)\s+([^\n.]{5,80})/i,
  );
  const memoMatch = compact.match(
    /(?:MEMORANDUM OF OBJECTS AND REASONS|EXPLANATORY MEMORANDUM)([\s\S]{20,2500}?)(?:THE\s+[A-Z].{0,40}BILL|ENACTED by the Parliament|PART\s+I\b|1\.\s+This Act)/i,
  );

  return {
    title: titleMatch ? tidyTitle(titleMatch[0]) : "Untitled Bill",
    billNumber: numberMatch ? numberMatch[1].trim() : null,
    year: yearMatch ? yearMatch[1] : null,
    house: houseMatch ? houseMatch[1] : null,
    sponsor: sponsorMatch ? sponsorMatch[1].trim() : null,
    explanatoryMemorandum: memoMatch ? memoMatch[1].replace(/\s+/g, " ").trim() : null,
  };
}

function tidyTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().replace(/,$/, "");
}

function inferHeading(text: string): string {
  for (const label of MARGINALS) {
    if (new RegExp(`\\b${label}\\b`, "i").test(text.slice(0, 180))) return label;
  }
  const first = text.split(/[.?\n]/)[0]?.trim() ?? "";
  return first.length > 80 ? `${first.slice(0, 77)}…` : first;
}

function inferSubject(text: string, heading: string): string {
  if (heading && heading !== "Untitled clause") return heading;
  return inferHeading(text);
}

function inferOperation(text: string): string {
  const lower = text.toLowerCase();
  if (/this act may be cited/.test(lower)) return "Names the Act";
  if (/unless the context otherwise requires/.test(lower)) return "Defines terms";
  if (/there is established/.test(lower)) return "Creates an institution";
  if (/may make regulations|may make rules|may prescribe/.test(lower)) {
    return "Delegates law-making power";
  }
  if (/commits an offence|liable on conviction/.test(lower)) return "Creates an offence or penalty";
  if (/tax|levy|fee|charge|fund/.test(lower)) return "Imposes or authorises a financial measure";
  if (/cancel|revoke|suspend|licence|license|permit/.test(lower)) {
    return "Creates an administrative power";
  }
  if (/shall come into force|commencement/.test(lower)) return "Commencement";
  return "Operative provision";
}

export function segmentClauses(text: string): Clause[] {
  const cleaned = text.replace(/\r/g, "").replace(/\u00a0/g, " ");
  const enacted = cleaned.search(/ENACTED by the Parliament of Kenya/i);
  const working = enacted >= 0 ? cleaned.slice(enacted) : cleaned;

  const clauseStart = /(?:^|\n)\s*(\d+)\.\s+(?=[A-Z("'“])/g;
  const starts: { number: string; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = clauseStart.exec(working))) {
    starts.push({ number: match[1], index: match.index + match[0].indexOf(match[1]) });
  }

  if (starts.length < 2) {
    return fallbackParagraphs(cleaned);
  }

  const clauses: Clause[] = [];
  for (let i = 0; i < starts.length; i++) {
    const current = starts[i];
    const next = starts[i + 1];
    const chunk = working.slice(current.index, next ? next.index : undefined).trim();
    const body = chunk.replace(/^\d+\.\s+/, "").trim();
    if (body.length < 8) continue;
    const heading = inferHeading(body);
    clauses.push({
      id: `cl-${current.number}-${nanoid(6)}`,
      clauseNumber: current.number,
      heading,
      text: body,
      position: clauses.length,
      subject: inferSubject(body, heading),
      operation: inferOperation(body),
    });
  }
  return clauses.length ? clauses : fallbackParagraphs(cleaned);
}

function fallbackParagraphs(text: string): Clause[] {
  const parts = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);
  return parts.slice(0, 80).map((body, i) => {
    const heading = inferHeading(body);
    return {
      id: `cl-${i + 1}-${nanoid(6)}`,
      clauseNumber: String(i + 1),
      heading,
      text: body,
      position: i,
      subject: inferSubject(body, heading),
      operation: inferOperation(body),
    };
  });
}
