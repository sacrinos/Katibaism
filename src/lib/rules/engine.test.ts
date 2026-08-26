import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { segmentClauses } from "@/lib/extraction/segment";
import { classifyBill, runClauseRules } from "@/lib/rules/engine";

const sample = readFileSync(
  path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
  "utf8",
);

describe("constitutional rules", () => {
  const clauses = segmentClauses(sample);

  function clause(n: string) {
    const found = clauses.find((c) => c.clauseNumber === n);
    if (!found) throw new Error(`missing clause ${n}`);
    return found;
  }

  it("flags incomplete delegation under Article 94(6)", () => {
    const hits = runClauseRules(clause("15"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_94_6")).toBe(true);
  });

  it("flags privacy collection without notice as an Article 31 question", () => {
    const hits = runClauseRules(clause("5"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_31_PRIVACY")).toBe(true);
  });

  it("flags licence cancellation without hearing as Article 47", () => {
    const hits = runClauseRules(clause("6"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_47")).toBe(true);
  });

  it("distinguishes a levy from a generic payment", () => {
    const hits = runClauseRules(clause("8"));
    const tax = hits.find((h) => h.ruleId === "PUBLIC_FINANCE_REVIEW");
    expect(tax?.whatItDoes.toLowerCase()).toMatch(/levy/);
  });

  it("surfaces a possible Article 110 county issue", () => {
    const hits = runClauseRules(clause("9"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_110")).toBe(true);
  });

  it("treats notwithstanding-the-Constitution language as a direct conflict question", () => {
    const hits = runClauseRules(clause("14"));
    expect(hits.some((h) => h.ruleId === "DIRECT_SUPREMACY")).toBe(true);
  });

  it("treats habeas corpus removal as an Article 25 question", () => {
    const hits = runClauseRules(clause("17"));
    expect(hits.some((h) => h.ruleId === "ART_25_NON_DEROGABLE")).toBe(true);
  });

  it("does not flag a short title as a constitutional conflict", () => {
    const hits = runClauseRules(clause("1"));
    expect(hits.filter((h) => h.severity === "critical")).toHaveLength(0);
  });

  it("does not treat a commencement date as incomplete delegated legislation", () => {
    const hits = runClauseRules(clause("18"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_94_6")).toBe(false);
  });

  it("does not treat a definitions clause as imposing a levy", () => {
    const hits = runClauseRules(clause("2"));
    expect(hits.some((h) => h.ruleId === "PUBLIC_FINANCE_REVIEW")).toBe(false);
  });

  it("flags a citizenship restriction as an equality question", () => {
    const hits = runClauseRules(clause("10"));
    expect(hits.some((h) => h.ruleId === "ARTICLE_27")).toBe(true);
  });

  it("classifies the sample as possibly a money and county Bill", () => {
    const classification = classifyBill(clauses, sample);
    expect(classification.possibleMoneyBill || classification.money.levies.length > 0).toBe(true);
    expect(classification.possibleCountyBill).toBe(true);
  });
});
