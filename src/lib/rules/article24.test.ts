import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { segmentClauses } from "@/lib/extraction/segment";
import { hitsToFindings, runClauseRules } from "@/lib/rules/engine";
import { shouldWalkArticle24, walkArticle24 } from "@/lib/rules/article24";

const sample = readFileSync(
  path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
  "utf8",
);

describe("Article 24 Test B", () => {
  const clauses = segmentClauses(sample);

  function clause(n: string) {
    const found = clauses.find((c) => c.clauseNumber === n);
    if (!found) throw new Error(`missing clause ${n}`);
    return found;
  }

  it("walks eight questions when Article 24 is cited", () => {
    const hits = runClauseRules(clause("5"));
    const privacy = hits.find((h) => h.ruleId === "ARTICLE_31_PRIVACY");
    expect(privacy).toBeTruthy();
    expect(shouldWalkArticle24(privacy!.provisionIds)).toBe(true);
    const findings = hitsToFindings(clause("5"), [privacy!]);
    const test = findings[0].article24Test;
    expect(test?.questions).toHaveLength(8);
    expect(test?.questions.map((q) => q.id)).toEqual([
      "by_law",
      "nature_of_right",
      "purpose",
      "extent",
      "rights_of_others",
      "necessity",
      "less_restrictive_means",
      "disproportionate_impact",
    ]);
    expect(test?.questions.find((q) => q.id === "less_restrictive_means")?.finding).not.toBe("yes");
    expect(test?.questions.find((q) => q.id === "necessity")?.finding).not.toBe("yes");
  });

  it("closes Article 24 where Article 25 forbids limitation", () => {
    const hits = runClauseRules(clause("17"));
    const habeas = hits.find((h) => h.ruleId === "ART_25_NON_DEROGABLE");
    expect(habeas).toBeTruthy();
    const test = walkArticle24(clause("17"), habeas!);
    expect(test.questions.find((q) => q.id === "by_law")?.finding).toBe("no");
    expect(test.questions.find((q) => q.id === "necessity")?.finding).toBe("no");
    expect(test.summary).toMatch(/Article 25/);
  });

  it("does not walk Article 24 for a short title", () => {
    const hits = runClauseRules(clause("1"));
    const findings = hitsToFindings(clause("1"), hits);
    expect(findings.every((f) => !f.article24Test)).toBe(true);
  });
});
