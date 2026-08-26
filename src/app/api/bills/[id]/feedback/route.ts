import { NextResponse } from "next/server";
import { awaitStore, recordFeedback } from "@/lib/store";
import type { FindingFeedback } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    findingId?: string;
    kind?: FindingFeedback["kind"];
    note?: string;
  };
  if (!body.findingId || !body.kind) {
    return NextResponse.json({ error: "findingId and kind are required." }, { status: 400 });
  }
  const bill = await awaitStore(
    recordFeedback(id, body.findingId, {
      kind: body.kind,
      note: body.note,
      createdAt: new Date().toISOString(),
    }),
  );
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  return NextResponse.json({ bill });
}
