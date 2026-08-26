import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { extractFromFile, extractFromText, extractFromUrl } from "@/lib/extraction/extract";
import { analyseClauses, applyAnalysis } from "@/lib/analysis/pipeline";
import { awaitStore, listBills, saveBill } from "@/lib/store";
import { uniqueSlug } from "@/lib/slug";
import type { BillRecord, InputMethod } from "@/lib/types";

export const runtime = "nodejs";

function emptyClassification() {
  return {
    possibleMoneyBill: false,
    possibleCountyBill: false,
    possibleConstitutionalAmendment: false,
    senateParticipationPossible: false,
    publicParticipationImplicated: false,
    money: {
      taxes: [],
      levies: [],
      fees: [],
      charges: [],
      appropriations: [],
      loans: [],
      guarantees: [],
      funds: [],
    },
    reasoning: [],
  };
}

function newBill(partial: Partial<BillRecord> & Pick<BillRecord, "title" | "rawText" | "clauses" | "inputMethod">): BillRecord {
  const id = nanoid(10);
  const now = new Date().toISOString();
  return {
    id,
    slug: uniqueSlug(partial.title, id),
    title: partial.title,
    billNumber: partial.billNumber ?? null,
    year: partial.year ?? null,
    house: partial.house ?? null,
    sponsor: partial.sponsor ?? null,
    sourceUrl: partial.sourceUrl ?? null,
    inputMethod: partial.inputMethod,
    originalFilename: partial.originalFilename ?? null,
    rawText: partial.rawText,
    explanatoryMemorandum: partial.explanatoryMemorandum ?? null,
    clauses: partial.clauses,
    findings: [],
    classification: emptyClassification(),
    summary: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      riskIndex: 0,
      overall: "none",
      label: "Not yet analysed",
    },
    versions: {
      constitutionVersion: "",
      analysisModel: "",
      analysisPromptVersion: "",
      rulesVersion: "",
      knowledgeBaseVersion: "",
      timestamp: now,
    },
    status: "parsed",
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET() {
  return NextResponse.json({ bills: await awaitStore(listBills()) });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let extracted;
    let inputMethod: InputMethod = "paste";
    let originalFilename: string | null = null;
    let sourceUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const sample = form.get("sample");
      if (sample === "true") {
        const text = readFileSync(
          path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
          "utf8",
        );
        extracted = await extractFromText(text);
        inputMethod = "sample";
        originalFilename = "digital-public-security-bill-2026.txt";
      } else if (form.get("url")) {
        sourceUrl = String(form.get("url"));
        extracted = await extractFromUrl(sourceUrl);
        inputMethod = "url";
      } else if (form.get("text")) {
        extracted = await extractFromText(String(form.get("text")));
        inputMethod = "paste";
      } else {
        const file = form.get("file");
        if (!(file instanceof File)) {
          return NextResponse.json({ error: "Upload a Bill, paste text, or provide a URL." }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        extracted = await extractFromFile(buffer, file.name);
        inputMethod = "upload";
        originalFilename = file.name;
      }
    } else {
      const body = (await request.json()) as { text?: string; url?: string; sample?: boolean };
      if (body.sample) {
        const text = readFileSync(
          path.join(process.cwd(), "data/samples/digital-public-security-bill-2026.txt"),
          "utf8",
        );
        extracted = await extractFromText(text);
        inputMethod = "sample";
      } else if (body.url) {
        extracted = await extractFromUrl(body.url);
        inputMethod = "url";
        sourceUrl = body.url;
      } else if (body.text) {
        extracted = await extractFromText(body.text);
        inputMethod = "paste";
      } else {
        return NextResponse.json({ error: "No Bill supplied." }, { status: 400 });
      }
    }

    if (!extracted.clauses.length) {
      return NextResponse.json(
        { error: "Katibaism could not identify clauses. Try pasting numbered clause text." },
        { status: 422 },
      );
    }

    let bill = newBill({
      title: extracted.metadata.title,
      billNumber: extracted.metadata.billNumber,
      year: extracted.metadata.year,
      house: extracted.metadata.house,
      sponsor: extracted.metadata.sponsor,
      sourceUrl,
      inputMethod,
      originalFilename,
      rawText: extracted.text,
      explanatoryMemorandum: extracted.metadata.explanatoryMemorandum,
      clauses: extracted.clauses,
    });
    bill = await awaitStore(saveBill(bill));

    const analysis = await analyseClauses(bill.clauses, bill.rawText);
    bill = await awaitStore(saveBill(applyAnalysis(bill, analysis)));

    return NextResponse.json({ bill });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
