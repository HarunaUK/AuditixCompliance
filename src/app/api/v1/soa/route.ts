import { NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { listSoa, soaSummary, updateSoaDecision } from "@/lib/services/soa";
import { recordActivity } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

const decisionBody = z
  .object({
    controlId: z.string().trim().min(1, "controlId is required."),
    applicable: z.boolean(),
    justification: z.string().trim().max(600).optional(),
  })
  .refine((value) => value.applicable || (value.justification ?? "").length >= 10, {
    message: "An exclusion needs a justification of at least 10 characters.",
    path: ["justification"],
  });

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const decision = url.searchParams.get("decision")?.toUpperCase();
    const [rows, summary] = await Promise.all([
      listSoa(context.workspaceId, {
        framework: url.searchParams.get("framework") ?? undefined,
        q: url.searchParams.get("q") ?? undefined,
        decision: decision === "APPLICABLE" || decision === "EXCLUDED" || decision === "GAPS" ? decision : "ALL",
      }),
      soaSummary(context.workspaceId),
    ]);
    return NextResponse.json({
      data: rows.map((row) => ({
        controlId: row.control.id,
        ref: row.control.ref,
        title: row.control.title,
        framework: row.control.framework,
        category: row.control.category,
        applicable: row.status !== "NOT_APPLICABLE",
        justification: row.justification,
        status: row.status,
        reviewedAt: row.reviewedAt,
        links: {
          policies: row.control.policies.length,
          risks: row.control.risks.length,
          evidence: row.control.evidence.length,
        },
      })),
      meta: { count: rows.length, workspaceId: context.workspaceId, summary },
    });
  });
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot change the SoA.", "forbidden");

    const input = decisionBody.parse(await readJson(request));
    const updated = await updateSoaDecision(context.workspaceId, input.controlId, {
      applicable: input.applicable,
      justification: input.justification?.trim() || null,
    });
    if (!updated) throw new ApiError(404, "Control not found in this workspace.", "not_found");

    await recordActivity({
      workspaceId: context.workspaceId,
      actor: context.user,
      action: input.applicable ? "soa.control_applied" : "soa.control_excluded",
      entityType: "Control",
      entityId: updated.controlId,
      summary: input.applicable ? `${updated.control.ref} marked applicable` : `${updated.control.ref} excluded from scope`,
      detail: input.justification?.trim() || updated.control.title,
    });

    return NextResponse.json({
      data: {
        controlId: updated.controlId,
        ref: updated.control.ref,
        status: updated.status,
        justification: updated.justification,
        reviewedAt: updated.reviewedAt,
      },
    });
  });
}
