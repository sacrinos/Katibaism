import { NextResponse } from "next/server";
import { dashboardStats } from "@/lib/store";

export async function GET() {
  return NextResponse.json(dashboardStats());
}
