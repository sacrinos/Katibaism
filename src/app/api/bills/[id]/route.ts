import { NextResponse } from "next/server";
import { getBill, getBillBySlug } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const bill = getBill(id) || getBillBySlug(id);
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  return NextResponse.json({ bill });
}
