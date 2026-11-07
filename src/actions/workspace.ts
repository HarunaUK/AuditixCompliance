"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { recordActivity } from "@/lib/services/activity";
import { getWorkspaceContext, setActiveWorkspace } from "@/lib/workspace";
import { canManageWorkspace } from "@/lib/rbac";
import {
  addMember,
  changePlan,
  createWorkspaceForUser,
  removeMember,
  renameWorkspace,
  updateMemberRole,
  WorkspaceError,
} from "@/lib/services/workspaces";
import { memberSchema, planSchema, workspaceSchema } from "@/lib/validation";
import type { Role } from "@prisma/client";

export type WorkspaceActionState = { error?: string; success?: string } | null;

export async function switchWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string") return;
  const switched = await setActiveWorkspace(user.id, workspaceId);
  if (!switched) redirect("/workspaces");
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function createWorkspaceAction(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const user = await requireUser();
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Name the workspace." };

  const workspace = await createWorkspaceForUser(user.id, parsed.data.name);
  await recordActivity({
    workspaceId: workspace.id,
    actor: user,
    action: "workspace.created",
    entityType: "Workspace",
    entityId: workspace.id,
    summary: `Created workspace “${workspace.name}”`,
    detail: "Owner account provisioned",
  });
  await setActiveWorkspace(user.id, workspace.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function renameWorkspaceAction(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) return { error: "Only workspace admins can rename the workspace." };
  const parsed = workspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a workspace name." };

  await renameWorkspace(context.workspace.id, parsed.data.name);
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "workspace.renamed",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Renamed workspace to “${parsed.data.name}”`,
    detail: `Previously “${context.workspace.name}”`,
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/activity");
  return { success: "Workspace name updated." };
}

export async function addMemberAction(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) return { error: "Only workspace admins can manage the team." };

  const parsed = memberSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the member details." };

  try {
    await addMember(context.workspace.id, parsed.data.email, parsed.data.role as Role, parsed.data.title || undefined);
  } catch (error) {
    return { error: error instanceof WorkspaceError ? error.message : "Could not add that member." };
  }
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "member.added",
    entityType: "Member",
    entityId: null,
    summary: `Added ${parsed.data.email} to the workspace`,
    detail: `${parsed.data.role.toLowerCase()} access`,
  });
  revalidatePath("/settings");
  revalidatePath("/activity");
  return { success: `${parsed.data.email} was added to the workspace.` };
}

export async function updateMemberRoleAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/settings?error=Only+admins+can+change+roles");
  const memberId = String(formData.get("memberId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!["ADMIN", "MEMBER", "CONSULTANT"].includes(role)) redirect("/settings?error=Invalid+role");

  const member = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: context.workspace.id },
    select: { user: { select: { name: true } } },
  });
  try {
    await updateMemberRole(context.workspace.id, memberId, role);
  } catch (error) {
    const message = error instanceof WorkspaceError ? error.message : "Could not update that role.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "member.role_changed",
    entityType: "Member",
    entityId: memberId,
    summary: `${member?.user.name ?? "A member"} is now ${role.toLowerCase()}`,
  });
  revalidatePath("/settings");
  revalidatePath("/activity");
  redirect("/settings?success=Role+updated");
}

export async function removeMemberAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/settings?error=Only+admins+can+remove+members");
  const memberId = String(formData.get("memberId") ?? "");
  const member = await db.workspaceMember.findFirst({
    where: { id: memberId, workspaceId: context.workspace.id },
    select: { user: { select: { name: true } } },
  });
  try {
    await removeMember(context.workspace.id, memberId, context.user.id);
  } catch (error) {
    const message = error instanceof WorkspaceError ? error.message : "Could not remove that member.";
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "member.removed",
    entityType: "Member",
    entityId: memberId,
    summary: `Removed ${member?.user.name ?? "a member"} from the workspace`,
  });
  revalidatePath("/settings");
  revalidatePath("/activity");
  redirect("/settings?success=Member+removed");
}

export async function changePlanAction(
  _state: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) return { error: "Only workspace admins can change the plan." };
  const parsed = planSchema.safeParse(formData.get("plan"));
  if (!parsed.success) return { error: "Choose a valid plan." };

  await changePlan(context.workspace.id, parsed.data);
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "workspace.plan_changed",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Changed plan to ${parsed.data.toLowerCase()}`,
    detail: "No payment taken in this demo",
  });
  revalidatePath("/billing");
  revalidatePath("/activity");
  revalidatePath("/", "layout");
  return { success: `Plan changed to ${parsed.data.toLowerCase()}. No payment was taken in this demo.` };
}
