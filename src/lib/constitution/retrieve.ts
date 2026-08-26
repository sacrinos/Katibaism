import { allProvisions, loadOntology } from "@/lib/constitution/load";
import type { ConstitutionProvision, OntologyMapping } from "@/lib/types";

export interface RetrievalHit {
  provision: ConstitutionProvision;
  score: number;
  reasons: string[];
  mappingIds: string[];
}

const STOP = new Set([
  "the", "and", "for", "that", "this", "with", "from", "shall", "may", "any",
  "under", "such", "into", "its", "are", "was", "were", "been", "being",
  "have", "has", "had", "not", "but", "or", "by", "of", "to", "in", "on",
  "a", "an", "as", "at", "be", "is", "it", "if", "no",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function matchOntology(text: string): {
  mappings: OntologyMapping[];
  phrases: string[];
} {
  const lower = text.toLowerCase();
  const mappings: OntologyMapping[] = [];
  const phrases: string[] = [];
  for (const mapping of loadOntology()) {
    const hits = mapping.phrases.filter((p) => lower.includes(p.toLowerCase()));
    if (hits.length) {
      mappings.push(mapping);
      phrases.push(...hits);
    }
  }
  return { mappings, phrases };
}

export function retrieveForClause(clauseText: string, extraIds: string[] = []): RetrievalHit[] {
  const provisions = allProvisions();
  const { mappings } = matchOntology(clauseText);
  const clauseTokens = new Set(tokens(clauseText));
  const scores = new Map<string, RetrievalHit>();

  function bump(provision: ConstitutionProvision, points: number, reason: string, mappingId?: string) {
    const existing = scores.get(provision.id);
    if (existing) {
      existing.score += points;
      existing.reasons.push(reason);
      if (mappingId && !existing.mappingIds.includes(mappingId)) {
        existing.mappingIds.push(mappingId);
      }
    } else {
      scores.set(provision.id, {
        provision,
        score: points,
        reasons: [reason],
        mappingIds: mappingId ? [mappingId] : [],
      });
    }
  }

  for (const mapping of mappings) {
    for (const id of mapping.provision_ids) {
      const provision = provisions.find((p) => p.id === id);
      if (provision) {
        bump(provision, 8, `ontology:${mapping.concept}`, mapping.id);
      }
    }
  }

  for (const id of extraIds) {
    const provision = provisions.find((p) => p.id === id);
    if (provision) bump(provision, 10, "rule-trigger");
  }

  for (const provision of provisions) {
    const haystack = new Set([
      ...tokens(provision.title),
      ...tokens(provision.concepts.join(" ")),
      ...tokens(provision.tags.join(" ")),
    ]);
    let overlap = 0;
    for (const t of clauseTokens) {
      if (haystack.has(t)) overlap += 1;
    }
    if (overlap >= 2) {
      bump(provision, overlap, `lexical-overlap:${overlap}`);
    }
  }

  return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, 8);
}

export function quoteFromProvision(provision: ConstitutionProvision, max = 420): string {
  const text = provision.text.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
