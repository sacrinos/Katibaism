import { NextResponse } from "next/server";
import { getProvision, getProvisionByCitation } from "@/lib/constitution/load";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const decoded = decodeURIComponent(id);
  const provision = getProvision(decoded) || getProvisionByCitation(decoded);
  if (!provision) return NextResponse.json({ error: "Provision not found." }, { status: 404 });
  return NextResponse.json({ provision });
}
