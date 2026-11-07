"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { soaDecisionSchema } from "@/lib/validation";
import { updateSoaDecision } from "@/lib/services/soa";
import { recordActivity } from "@/lib/services/activity";

export async function saveSoaDecisionAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/soa?error=Read-only+role");

  const controlId = String(formData.get("controlId") ?? "");
  const parsed = soaDecisionSchema.safeParse({
    applicable: formData.get("applicable"),
    justification: formData.get("justification"),
  });
  if (!parsed.success) {
    redirect(`/soa?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the decision.")}`);
  }

  const updated = await updateSoaDecision(context.workspace.id, controlId, {
    applicable: parsed.data.applicable === "yes",
    justification: parsed.data.justification?.trim() || null,
  });
  if (!updated) redirect("/soa?error=Control+not+found+in+this+workspace");

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: parsed.data.applicable === "yes" ? "soa.control_applied" : "soa.control_excluded",
    entityType: "Control",
    entityId: updated.controlId,
    summary:
      parsed.data.applicable === "yes"
        ? `${updated.control.ref} marked applicable`
        : `${updated.control.ref} excluded from scope`,
    detail: parsed.data.justification?.trim() || updated.control.title,
  });

  revalidatePath("/soa");
  revalidatePath("/controls");
  revalidatePath("/readiness");
  revalidatePath("/dashboard");
  redirect(`/soa?saved=${encodeURIComponent(updated.control.ref)}`);
}
