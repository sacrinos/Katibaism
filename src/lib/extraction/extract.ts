import { extractMetadata, segmentClauses } from "@/lib/extraction/segment";
import type { BillMetadata } from "@/lib/extraction/segment";
import type { Clause } from "@/lib/types";

export interface ExtractedDocument {
  text: string;
  metadata: BillMetadata;
  clauses: Clause[];
  method: "text" | "pdf" | "docx" | "url";
}

function looksLikePdf(buffer: Buffer, filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf") || buffer.subarray(0, 5).toString() === "%PDF-";
}

function looksLikeDocx(filename: string): boolean {
  return /\.docx$/i.test(filename);
}

export async function extractFromText(text: string): Promise<ExtractedDocument> {
  const metadata = extractMetadata(text);
  return {
    text,
    metadata,
    clauses: segmentClauses(text),
    method: "text",
  };
}

export async function extractFromFile(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedDocument> {
  if (looksLikePdf(buffer, filename)) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      const text = result.text?.trim() || "";
      if (text.length < 40) {
        throw new Error(
          "PDF text extraction returned too little text. The file may be a scan; OCR is not enabled in this environment. Paste the Bill text instead.",
        );
      }
      const metadata = extractMetadata(text);
      return { text, metadata, clauses: segmentClauses(text), method: "pdf" };
    } finally {
      await parser.destroy();
    }
  }

  if (looksLikeDocx(filename)) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    const metadata = extractMetadata(text);
    return { text, metadata, clauses: segmentClauses(text), method: "docx" };
  }

  const text = buffer.toString("utf8");
  return extractFromText(text);
}

const ALLOWED_HOSTS = new Set([
  "parliament.go.ke",
  "www.parliament.go.ke",
  "kenyalaw.org",
  "www.kenyalaw.org",
  "new.kenyalaw.org",
]);

export async function extractFromUrl(url: string): Promise<ExtractedDocument> {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(
      "Only official Parliament of Kenya or Kenya Law URLs can be fetched in the MVP.",
    );
  }
  const response = await fetch(url, {
    headers: { "User-Agent": "Katibaism/0.1 (constitutional analysis; +https://katibaism.ke)" },
  });
  if (!response.ok) {
    throw new Error(`Could not fetch the Bill (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "";
  const bytes = Buffer.from(await response.arrayBuffer());
  if (contentType.includes("pdf") || parsed.pathname.toLowerCase().endsWith(".pdf")) {
    const extracted = await extractFromFile(bytes, "remote.pdf");
    return { ...extracted, method: "url" };
  }
  const html = bytes.toString("utf8");
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  const extracted = await extractFromText(text);
  return { ...extracted, method: "url" };
}
