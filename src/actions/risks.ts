"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { recordActivity } from "@/lib/services/activity";
import { canWrite } from "@/lib/rbac";
import { parseControlIds, riskActionSchema, riskSchema } from "@/lib/validation";
import {
  addRiskAction,
  createRisk,
  deleteRisk,
  deleteRiskAction as deleteRiskActionRecord,
  toggleRiskAction,
  updateRisk,
} from "@/lib/services/risks";

export type RiskActionState = { error?: string; success?: string } | null;

async function resolveOwner(workspaceId: string, requested: FormDataEntryValue | null, fallback: string) {
  const ownerId = typeof requested === "string" && requested ? requested : fallback;
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: ownerId },
    select: { userId: true },
  });
  return member?.userId ?? fallback;
}

export async function createRiskAction(
  _state: RiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  const parsed = riskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    likelihood: formData.get("likelihood"),
    impact: formData.get("impact"),
    treatment: formData.get("treatment"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    ownerId: formData.get("ownerId"),
    controlIds: parseControlIds(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the risk details." };

  const ownerId = await resolveOwner(context.workspace.id, formData.get("ownerId"), context.user.id);
  const risk = await createRisk(context.workspace.id, ownerId, parsed.data);
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "risk.created",
    entityType: "Risk",
    entityId: risk.id,
    summary: `Raised risk “${risk.title}”`,
    detail: `${risk.category} · score ${risk.score}`,
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/risks");
  revalidatePath("/dashboard");
  redirect(`/risks/${risk.id}`);
}

export async function updateRiskAction(
  _state: RiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  const riskId = String(formData.get("riskId") ?? "");
  const parsed = riskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    likelihood: formData.get("likelihood"),
    impact: formData.get("impact"),
    treatment: formData.get("treatment"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    ownerId: formData.get("ownerId"),
    controlIds: parseControlIds(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the risk details." };

  const ownerId = await resolveOwner(context.workspace.id, formData.get("ownerId"), context.user.id);
  const risk = await updateRisk(context.workspace.id, riskId, ownerId, parsed.data);
  if (!risk) return { error: "Risk not found in this workspace." };
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "risk.updated",
    entityType: "Risk",
    entityId: risk.id,
    summary: `Updated risk “${risk.title}”`,
    detail: `Score ${risk.score} · ${risk.status.replaceAll("_", " ").toLowerCase()}`,
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/risks");
  revalidatePath(`/risks/${riskId}`);
  redirect(`/risks/${riskId}?saved=1`);
}

export async function addRiskActionAction(
  _state: RiskActionState,
  formData: FormData,
): Promise<RiskActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  const riskId = String(formData.get("riskId") ?? "");
  const parsed = riskActionSchema.safeParse({ title: formData.get("title"), dueDate: formData.get("dueDate") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Describe the action." };

  const action = await addRiskAction(context.workspace.id, riskId, context.user.id, parsed.data);
  if (!action) return { error: "Risk not found in this workspace." };
  const risk = await db.risk.findFirst({ where: { id: riskId, workspaceId: context.workspace.id }, select: { title: true } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "risk.action_added",
    entityType: "Risk",
    entityId: riskId,
    summary: `Added treatment action “${action.title}”`,
    detail: risk ? `For “${risk.title}”` : null,
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath(`/risks/${riskId}`);
  revalidatePath("/dashboard");
  return { success: "Action added to the treatment plan." };
}

export async function toggleRiskActionAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/risks?error=Read-only+role");
  const actionId = String(formData.get("actionId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const toggled = await toggleRiskAction(context.workspace.id, actionId);
  if (toggled) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "risk.action_toggled",
      entityType: "Risk",
      entityId: riskId,
      summary: toggled.done ? `Completed action “${toggled.title}”` : `Reopened action “${toggled.title}”`,
      detail: "Treatment plan updated",
    });
  }
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/dashboard");
  revalidatePath(`/risks/${riskId}`);
  revalidatePath("/dashboard");
  redirect(`/risks/${riskId}`);
}

export async function removeRiskActionAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/risks?error=Read-only+role");
  const actionId = String(formData.get("actionId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const action = await db.riskAction.findFirst({
    where: { id: actionId, risk: { workspaceId: context.workspace.id } },
    select: { title: true },
  });
  await deleteRiskActionRecord(context.workspace.id, actionId);
  if (action) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "risk.action_removed",
      entityType: "Risk",
      entityId: riskId,
      summary: `Removed treatment action “${action.title}”`,
    });
  }
  revalidatePath("/activity");
  revalidatePath(`/risks/${riskId}`);
  redirect(`/risks/${riskId}`);
}

export async function deleteRiskAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/risks?error=Read-only+role");
  const riskId = String(formData.get("riskId") ?? "");
  const risk = await db.risk.findFirst({
    where: { id: riskId, workspaceId: context.workspace.id },
    select: { title: true },
  });
  const deleted = await deleteRisk(context.workspace.id, riskId);
  if (deleted && risk) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "risk.deleted",
      entityType: "Risk",
      entityId: riskId,
      summary: `Deleted risk “${risk.title}”`,
      detail: "Risk record and linked controls removed",
    });
  }
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/risks");
  revalidatePath("/dashboard");
  redirect("/risks?deleted=1");
}
