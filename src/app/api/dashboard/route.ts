import { NextResponse } from "next/server";
import { awaitStore, dashboardStats } from "@/lib/store";

export async function GET() {
  return NextResponse.json(await awaitStore(dashboardStats()));
}
