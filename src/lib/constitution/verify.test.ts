import { describe, expect, it } from "vitest";
import { getProvision } from "@/lib/constitution/load";
import { verifyCitation, verifyFinding } from "@/lib/constitution/verify";
import { quoteFromProvision } from "@/lib/constitution/retrieve";
import type { Finding } from "@/lib/types";

function fakeFinding(over: Partial<Finding> = {}): Finding {
  return {
    id: "x",
    clauseId: "c",
    clauseNumber: "1",
    clauseText: "test",
    issueType: "direct_conflict",
    title: "t",
    whatItDoes: "",
    whyItMatters: "",
    citizenExplanation: "",
    legalExplanation: "",
    counterargument: "c",
    whatToInvestigate: "",
    severity: "high",
    confidence: "high",
    confidenceScore: 80,
    provisionIds: ["art-2"],
    citations: [],
    triggeringLanguage: [],
    concepts: [],
    rulesTriggered: [],
    humanReviewRecommended: true,
    whyFlagged: {
      triggeringLanguage: [],
      concept: "",
      retrievedProvisions: [],
      rulesTriggered: [],
      reasoning: "",
      counterargument: "",
      confidence: 80,
    },
    ...over,
  };
}

describe("citation verifier", () => {
  it("accepts a real quotation from Article 2", () => {
    const art2 = getProvision("art-2");
    expect(art2).toBeTruthy();
    const citation = verifyCitation({
      provisionId: "art-2",
      citation: "Article 2",
      title: art2!.title,
      quotedText: quoteFromProvision(art2!, 200),
      verified: false,
    });
    expect(citation.verified).toBe(true);
  });

  it("rejects a fabricated article", () => {
    const citation = verifyCitation({
      provisionId: "art-999",
      citation: "Article 999",
      title: "Imaginary",
      quotedText: "This article does not exist",
      verified: false,
    });
    expect(citation.verified).toBe(false);
  });

  it("drops findings whose citations fail verification", () => {
    const finding = verifyFinding(
      fakeFinding({
        citations: [
          {
            provisionId: "art-2",
            citation: "Article 2",
            title: "Supremacy",
            quotedText: "completely invented quotation about supremacy",
            verified: false,
          },
        ],
      }),
    );
    expect(finding).toBeNull();
  });
});
