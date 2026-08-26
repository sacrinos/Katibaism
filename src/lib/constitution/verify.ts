import { getProvision } from "@/lib/constitution/load";
import type { Citation, Finding } from "@/lib/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyCitation(citation: Citation): Citation {
  const provision = getProvision(citation.provisionId);
  if (!provision) {
    return { ...citation, verified: false };
  }
  if (provision.citation !== citation.citation) {
    return { ...citation, verified: false };
  }
  const quoted = normalize(citation.quotedText.replace(/…$/, ""));
  const source = normalize(provision.text);
  const title = normalize(provision.title);
  const ok = quoted.length >= 12 && (source.includes(quoted) || title.includes(quoted));
  return {
    ...citation,
    title: provision.title,
    verified: ok,
  };
}

export function verifyFinding(finding: Finding): Finding | null {
  const citations = finding.citations.map(verifyCitation).filter((c) => c.verified);
  if (!citations.length) return null;
  const provisionIds = [...new Set(citations.map((c) => c.provisionId))];
  return {
    ...finding,
    citations,
    provisionIds,
  };
}

export function verifyFindings(findings: Finding[]): { kept: Finding[]; rejected: string[] } {
  const kept: Finding[] = [];
  const rejected: string[] = [];
  for (const finding of findings) {
    const verified = verifyFinding(finding);
    if (verified) kept.push(verified);
    else rejected.push(finding.id);
  }
  return { kept, rejected };
}
