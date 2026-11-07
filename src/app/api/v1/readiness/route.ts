import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { readinessReport } from "@/lib/services/readiness";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const report = await readinessReport(context.workspaceId);
    return NextResponse.json({
      data: {
        workspaceId: context.workspaceId,
        percent: report.percent,
        status: report.status,
        label: report.label,
        completePhases: report.completePhases,
        blockers: report.blockers,
        phases: report.phases,
        updatedAt: report.updatedAt,
      },
    });
  });
}
