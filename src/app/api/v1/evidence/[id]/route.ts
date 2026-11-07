import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { deleteEvidence } from "@/lib/services/evidence";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot delete evidence.", "forbidden");
    const { id } = await params;
    const evidence = await db.evidence.findFirst({
      where: { id, workspaceId: context.workspaceId },
      select: { name: true },
    });
    const deleted = await deleteEvidence(context.workspaceId, id);
    if (!deleted) throw new ApiError(404, "Evidence not found in this workspace.", "not_found");
    await recordActivity({
      workspaceId: context.workspaceId,
      actor: context.user,
      action: "evidence.deleted",
      entityType: "Evidence",
      entityId: id,
      summary: `Deleted evidence “${evidence?.name ?? "an artifact"}”`,
      detail: "Stored file removed",
    });
    return NextResponse.json({ data: { id, deleted: true } });
  });
}
