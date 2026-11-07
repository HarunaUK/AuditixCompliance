import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { dashboardData } from "@/lib/services/dashboard";
import { riskMatrix } from "@/lib/services/risks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const [dashboard, matrix] = await Promise.all([dashboardData(context.workspaceId), riskMatrix(context.workspaceId)]);
    return NextResponse.json({
      data: {
        workspaceId: context.workspaceId,
        coverage: dashboard.controls,
        frameworks: dashboard.frameworks,
        policies: dashboard.policies,
        risks: dashboard.risks,
        riskMatrix: matrix,
        evidence: dashboard.evidence,
        members: dashboard.members,
        openActions: dashboard.openActions,
        policiesDue: dashboard.policiesDue,
        actions: dashboard.actions,
        recentActivity: dashboard.activity,
      },
    });
  });
}
