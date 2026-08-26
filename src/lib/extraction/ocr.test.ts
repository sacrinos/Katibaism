import { describe, expect, it } from "vitest";
import { isSparsePdfText, joinOcrPages } from "@/lib/extraction/ocr";

describe("OCR helpers", () => {
  it("treats empty and near-empty PDF text as sparse", () => {
    expect(isSparsePdfText("")).toBe(true);
    expect(isSparsePdfText("   \n\t")).toBe(true);
    expect(isSparsePdfText("page")).toBe(true);
    expect(isSparsePdfText("A Bill for an Act of Parliament to provide for public security")).toBe(false);
  });

  it("joins OCR pages in order", () => {
    const text = joinOcrPages([
      { pageNumber: 2, text: "Clause 2." },
      { pageNumber: 1, text: "Clause 1." },
    ]);
    expect(text).toBe("Clause 1.\n\nClause 2.");
  });
});
