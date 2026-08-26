import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractMetadata, segmentClauses } from "@/lib/extraction/segment";

const sample = readFileSync(
  path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
  "utf8",
);

describe("segmentClauses", () => {
  it("extracts numbered Kenyan Bill clauses", () => {
    const clauses = segmentClauses(sample);
    expect(clauses.length).toBeGreaterThanOrEqual(17);
    expect(clauses[0]?.clauseNumber).toBe("1");
    expect(clauses[0]?.text).toMatch(/This Act may be cited/);
    expect(clauses.find((c) => c.clauseNumber === "15")?.text).toMatch(/Cabinet Secretary may make regulations/);
  });

  it("reads title and year", () => {
    const meta = extractMetadata(sample);
    expect(meta.title.toUpperCase()).toContain("DIGITAL PUBLIC SECURITY");
    expect(meta.year).toBe("2026");
  });
});
