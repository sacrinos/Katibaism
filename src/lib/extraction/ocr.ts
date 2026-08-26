export const SPARSE_PDF_TEXT = 40;
export const OCR_PAGE_LIMIT = 30;

export function isSparsePdfText(text: string): boolean {
  return text.replace(/\s+/g, "").length < SPARSE_PDF_TEXT;
}

export function joinOcrPages(pages: { pageNumber: number; text: string }[]): string {
  return pages
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export async function ocrImageBuffer(buffer: Buffer): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(buffer);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

type PdfParser = {
  getImage: (params: { imageBuffer: boolean; imageDataUrl: boolean; imageThreshold?: number }) => Promise<{
    pages: { pageNumber: number; images: { data?: Uint8Array }[] }[];
  }>;
  getScreenshot: (params: {
    imageBuffer: boolean;
    imageDataUrl: boolean;
    desiredWidth?: number;
    first?: number;
    last?: number;
  }) => Promise<{
    pages: { pageNumber: number; data?: Uint8Array }[];
  }>;
};

export async function ocrSparsePdf(parser: PdfParser): Promise<string> {
  const fromImages = await ocrEmbeddedImages(parser);
  if (!isSparsePdfText(fromImages)) return fromImages;

  const fromScreens = await ocrScreenshots(parser);
  if (!isSparsePdfText(fromScreens)) return fromScreens;

  const combined = joinOcrPages([
    { pageNumber: 1, text: fromImages },
    { pageNumber: 2, text: fromScreens },
  ]);
  return combined.trim();
}

async function ocrEmbeddedImages(parser: PdfParser): Promise<string> {
  try {
    const images = await parser.getImage({
      imageBuffer: true,
      imageDataUrl: false,
      imageThreshold: 80,
    });
    const pages: { pageNumber: number; text: string }[] = [];
    for (const page of images.pages.slice(0, OCR_PAGE_LIMIT)) {
      const chunks: string[] = [];
      for (const image of page.images) {
        if (!image.data?.length) continue;
        chunks.push(await ocrImageBuffer(Buffer.from(image.data)));
      }
      pages.push({ pageNumber: page.pageNumber, text: chunks.join("\n") });
    }
    return joinOcrPages(pages);
  } catch {
    return "";
  }
}

async function ocrScreenshots(parser: PdfParser): Promise<string> {
  try {
    const shots = await parser.getScreenshot({
      imageBuffer: true,
      imageDataUrl: false,
      desiredWidth: 1400,
      first: 1,
      last: OCR_PAGE_LIMIT,
    });
    const pages: { pageNumber: number; text: string }[] = [];
    for (const page of shots.pages.slice(0, OCR_PAGE_LIMIT)) {
      if (!page.data?.length) continue;
      pages.push({
        pageNumber: page.pageNumber,
        text: await ocrImageBuffer(Buffer.from(page.data)),
      });
    }
    return joinOcrPages(pages);
  } catch {
    return "";
  }
}
