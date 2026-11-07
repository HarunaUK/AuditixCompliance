import { NextResponse } from "next/server";
import { apiHandler, getApiContext } from "@/lib/api";
import { coverage } from "@/lib/services/controls";
import { evidenceSummary } from "@/lib/services/evidence";
import { policyCounts } from "@/lib/services/policies";
import { riskSummary } from "@/lib/services/risks";
import { workspaceStats } from "@/lib/services/workspaces";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const [stats, coverageSummary, evidence, policies, risks] = await Promise.all([
      workspaceStats(context.workspaceId),
      coverage(context.workspaceId),
      evidenceSummary(context.workspaceId),
      policyCounts(context.workspaceId),
      riskSummary(context.workspaceId),
    ]);

    return NextResponse.json({
      data: {
        workspace: {
          id: context.membership.workspace.id,
          name: context.membership.workspace.name,
          slug: context.membership.workspace.slug,
          plan: context.membership.workspace.plan,
          planName: PLANS[context.membership.workspace.plan].name,
          createdAt: context.membership.workspace.createdAt,
        },
        role: context.role,
        stats,
        coverage: coverageSummary,
        evidence,
        policies,
        risks,
      },
    });
  });
}
