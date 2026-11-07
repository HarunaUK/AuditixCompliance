import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { policySchema } from "@/lib/validation";
import { createPolicy, listPolicies } from "@/lib/services/policies";
import { recordActivity } from "@/lib/services/activity";
import type { PolicyStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "RETIRED"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const requested = url.searchParams.get("status")?.toUpperCase();
    const status = requested && STATUSES.includes(requested) ? (requested as PolicyStatus) : "ALL";
    const policies = await listPolicies(context.workspaceId, {
      q: url.searchParams.get("q") ?? undefined,
      status,
      framework: url.searchParams.get("framework") ?? undefined,
    });
    return NextResponse.json({ data: policies, meta: { count: policies.length, workspaceId: context.workspaceId } });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot create policies.", "forbidden");
    const body = await readJson(request);
    const input = policySchema.parse(body);
    const policy = await createPolicy(context.workspaceId, context.user.id, input);
    await recordActivity({
      workspaceId: context.workspaceId,
      actor: context.user,
      action: "policy.created",
      entityType: "Policy",
      entityId: policy.id,
      summary: `Created policy “${policy.title}”`,
      detail: `${policy.category} · draft v${policy.version}`,
    });
    return NextResponse.json({ data: policy }, { status: 201 });
  });
}
