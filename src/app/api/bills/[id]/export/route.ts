import { NextResponse } from "next/server";
import { getBill, getBillBySlug } from "@/lib/store";
import { toCsv, toMarkdown } from "@/lib/export/formats";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const bill = getBill(id) || getBillBySlug(id);
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") || "json";

  if (format === "md" || format === "markdown") {
    return new NextResponse(toMarkdown(bill), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${bill.slug}.md"`,
      },
    });
  }
  if (format === "csv") {
    return new NextResponse(toCsv(bill), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${bill.slug}.csv"`,
      },
    });
  }
  return NextResponse.json(bill, {
    headers: {
      "content-disposition": `attachment; filename="${bill.slug}.json"`,
    },
  });
}
