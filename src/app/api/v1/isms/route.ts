import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiHandler, getApiContext } from "@/lib/api";
import { getProfile } from "@/lib/services/isms";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const [profile, contextItems, roles, objectives, audits, reviews, training] = await Promise.all([
      getProfile(context.workspaceId),
      db.contextItem.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { createdAt: "desc" } }),
      db.ismsRole.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { createdAt: "asc" } }),
      db.objective.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { createdAt: "asc" } }),
      db.internalAudit.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { auditDate: "desc" } }),
      db.managementReview.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { reviewDate: "desc" } }),
      db.trainingRecord.findMany({ where: { workspaceId: context.workspaceId }, orderBy: { createdAt: "desc" } }),
    ]);

    return NextResponse.json({
      data: {
        workspaceId: context.workspaceId,
        profile,
        context: contextItems,
        roles,
        objectives,
        internalAudits: audits,
        managementReviews: reviews,
        training,
      },
      meta: {
        counts: {
          context: contextItems.length,
          roles: roles.length,
          objectives: objectives.length,
          internalAudits: audits.length,
          managementReviews: reviews.length,
          training: training.length,
        },
      },
    });
  });
}
