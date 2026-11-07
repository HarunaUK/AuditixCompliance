import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { controlStatusSchema } from "@/lib/validation";
import { updateControlStatus } from "@/lib/services/controls";
import { db } from "@/lib/db";
import { recordActivity } from "@/lib/services/activity";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot change control status.", "forbidden");
    const { id } = await params;
    const body = await readJson<{ status?: unknown }>(request);
    const status = controlStatusSchema.parse(body?.status);
    const updated = await updateControlStatus(context.workspaceId, id, status);
    if (!updated) throw new ApiError(404, "Control not found in this workspace.", "not_found");
    const control = await db.workspaceControl.findFirst({
      where: { workspaceId: context.workspaceId, controlId: id },
      select: { control: { select: { ref: true, title: true } } },
    });
    await recordActivity({
      workspaceId: context.workspaceId,
      actor: context.user,
      action: "control.status_changed",
      entityType: "Control",
      entityId: id,
      summary: control
        ? `${control.control.ref} set to ${status.replaceAll("_", " ").toLowerCase()}`
        : `Control set to ${status.replaceAll("_", " ").toLowerCase()}`,
      detail: control?.control.title ?? null,
    });
    return NextResponse.json({ data: { controlId: id, status } });
  });
}
