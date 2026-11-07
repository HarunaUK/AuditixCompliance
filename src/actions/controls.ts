"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlStatusSchema } from "@/lib/validation";
import { updateControlStatus } from "@/lib/services/controls";
import { recordActivity } from "@/lib/services/activity";

export async function updateControlStatusAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/controls?error=Read-only+role");

  const controlId = String(formData.get("controlId") ?? "");
  const parsed = controlStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) redirect("/controls?error=Invalid+status");

  const updated = await updateControlStatus(context.workspace.id, controlId, parsed.data);
  if (updated) {
    const control = await db.workspaceControl.findFirst({
      where: { workspaceId: context.workspace.id, controlId },
      select: { control: { select: { ref: true, title: true } } },
    });
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "control.status_changed",
      entityType: "Control",
      entityId: controlId,
      summary: control
        ? `${control.control.ref} set to ${parsed.data.replaceAll("_", " ").toLowerCase()}`
        : `Control set to ${parsed.data.replaceAll("_", " ").toLowerCase()}`,
      detail: control?.control.title ?? null,
    });
  }
  revalidatePath("/controls");
  revalidatePath("/soa");
  revalidatePath("/readiness");
  revalidatePath("/activity");
  revalidatePath("/dashboard");
}
