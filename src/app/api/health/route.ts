import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: BRAND.name,
    sdg: BRAND.sdgGoal,
    timestamp: new Date().toISOString(),
    api_ready: true,
  });
}
