import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { riskSchema } from "@/lib/validation";
import { createRisk, listRisks } from "@/lib/services/risks";
import { recordActivity } from "@/lib/services/activity";
import type { RiskStatus, Treatment } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = ["OPEN", "MONITORING", "MITIGATED", "CLOSED"];
const TREATMENTS = ["MITIGATE", "ACCEPT", "TRANSFER", "AVOID"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const requestedStatus = url.searchParams.get("status")?.toUpperCase();
    const requestedTreatment = url.searchParams.get("treatment")?.toUpperCase();
    const risks = await listRisks(context.workspaceId, {
      q: url.searchParams.get("q") ?? undefined,
      status: requestedStatus && STATUSES.includes(requestedStatus) ? (requestedStatus as RiskStatus) : "ALL",
      treatment:
        requestedTreatment && TREATMENTS.includes(requestedTreatment) ? (requestedTreatment as Treatment) : "ALL",
    });
    return NextResponse.json({ data: risks, meta: { count: risks.length, workspaceId: context.workspaceId } });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot create risks.", "forbidden");
    const body = await readJson(request);
    const input = riskSchema.parse(body);
    const risk = await createRisk(context.workspaceId, context.user.id, input);
    await recordActivity({
      workspaceId: context.workspaceId,
      actor: context.user,
      action: "risk.created",
      entityType: "Risk",
      entityId: risk.id,
      summary: `Raised risk “${risk.title}”`,
      detail: `${risk.category} · score ${risk.score}`,
    });
    return NextResponse.json({ data: risk }, { status: 201 });
  });
}
