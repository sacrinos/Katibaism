import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyseClauses } from "@/lib/analysis/pipeline";
import { segmentClauses } from "@/lib/extraction/segment";

const sample = readFileSync(
  path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
  "utf8",
);

describe("analysis pipeline", () => {
  it("produces verified, cited findings for the sample Bill", async () => {
    const clauses = segmentClauses(sample);
    const result = await analyseClauses(clauses, sample);
    expect(result.findings.length).toBeGreaterThan(8);
    expect(result.summary.critical).toBeGreaterThan(0);
    expect(result.rejectedCitations).toEqual([]);
    for (const finding of result.findings) {
      expect(finding.citations.length).toBeGreaterThan(0);
      expect(finding.citations.every((c) => c.verified)).toBe(true);
      expect(finding.counterargument.length).toBeGreaterThan(20);
      expect(finding.citizenExplanation.length).toBeGreaterThan(20);
    }
    const articles = result.findings.flatMap((f) => f.citations.map((c) => c.citation));
    expect(articles.some((a) => a.startsWith("Article 94"))).toBe(true);
    expect(articles).toContain("Article 2");
    expect(articles).toContain("Article 47");
    const art24 = result.findings.find((f) => f.article24Test);
    expect(art24?.article24Test?.questions).toHaveLength(8);
  });
});
