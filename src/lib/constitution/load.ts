import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ConstitutionKnowledgeBase,
  ConstitutionProvision,
  OntologyMapping,
} from "@/lib/types";

let cachedKb: ConstitutionKnowledgeBase | null = null;
let cachedOntology: OntologyMapping[] | null = null;

function dataRoot(): string {
  return path.join(process.cwd(), "data");
}

export function loadKnowledgeBase(): ConstitutionKnowledgeBase {
  if (cachedKb) return cachedKb;
  const file = path.join(dataRoot(), "constitution", "kenya-2010.v1.json");
  cachedKb = JSON.parse(readFileSync(file, "utf8")) as ConstitutionKnowledgeBase;
  return cachedKb;
}

export function loadOntology(): OntologyMapping[] {
  if (cachedOntology) return cachedOntology;
  const file = path.join(dataRoot(), "ontology", "concepts.json");
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    mappings: OntologyMapping[];
  };
  cachedOntology = raw.mappings;
  return cachedOntology;
}

export function getProvision(id: string): ConstitutionProvision | undefined {
  return loadKnowledgeBase().provisions.find((p) => p.id === id);
}

export function getProvisionByCitation(citation: string): ConstitutionProvision | undefined {
  const normalised = citation.trim().toLowerCase();
  return loadKnowledgeBase().provisions.find(
    (p) => p.citation.toLowerCase() === normalised || p.id === citation,
  );
}

export function constitutionVersion(): string {
  return loadKnowledgeBase().version;
}

export function allProvisions(): ConstitutionProvision[] {
  return loadKnowledgeBase().provisions;
}
