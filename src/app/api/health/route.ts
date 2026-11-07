import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageMode } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      checks: { database: "ok", storage: storageMode() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json(
      { status: "degraded", checks: { database: "error" }, timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
