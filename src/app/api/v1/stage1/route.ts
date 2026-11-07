import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { stage1Report } from "@/lib/services/stage1";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const report = await stage1Report(context.workspaceId);
    return NextResponse.json({
      data: {
        workspaceId: context.workspaceId,
        met: report.met,
        total: report.total,
        percent: report.percent,
        ready: report.ready,
        checks: report.checks,
        advisory: report.advisory,
        generatedAt: report.generatedAt,
      },
    });
  });
}
