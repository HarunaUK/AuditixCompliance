import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness probe used by scripts/serve.mjs. It touches the database so a warm
 * response also means the Prisma engine and its connection pool are ready —
 * otherwise the first real page load pays that startup cost.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "up" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
