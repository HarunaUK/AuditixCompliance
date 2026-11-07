import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { controlMeta, coverage, listControls } from "@/lib/services/controls";
import type { ControlStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.toUpperCase();
    const [controls, meta, totals] = await Promise.all([
      listControls(context.workspaceId, {
        framework: url.searchParams.get("framework") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        q: url.searchParams.get("q") ?? undefined,
        status: requestedStatus && STATUSES.includes(requestedStatus) ? (requestedStatus as ControlStatus) : "ALL",
      }),
      controlMeta(context.workspaceId),
      coverage(context.workspaceId),
    ]);
    return NextResponse.json({
      data: controls,
      meta: { count: controls.length, workspaceId: context.workspaceId, frameworks: meta.frameworks, coverage: totals },
    });
  });
}
