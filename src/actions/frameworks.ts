"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ControlStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";

const STATUSES: ControlStatus[] = ["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"];
const REVIEWS = new Set(["QUARTERLY", "HALF_YEARLY", "YEARLY"]);

function frameworkPath(key: string, message?: string) {
  return `/frameworks/${key}${message ? `?error=${encodeURIComponent(message)}` : ""}`;
}

export async function updateFrameworkControlAction(formData: FormData) {
  const context = await getWorkspaceContext();
  const key = String(formData.get("frameworkKey") ?? "");
  const controlId = String(formData.get("controlId") ?? "");

  if (!canWrite(context.role)) redirect(frameworkPath(key, "Read-only role"));

  const control = await db.frameworkControl.findFirst({
    where: { id: controlId, framework: { key } },
    select: { id: true, ref: true, title: true },
  });
  if (!control) redirect(frameworkPath(key, "Unknown control"));

  const data: Prisma.WorkspaceControlUncheckedUpdateInput = {};

  const status = formData.get("status");
  if (status !== null && status !== "") {
    if (!STATUSES.includes(status as ControlStatus)) redirect(frameworkPath(key, "Invalid status"));
    data.status = status as ControlStatus;
  }

  if (formData.has("ownerId")) {
    const ownerId = String(formData.get("ownerId") ?? "");
    if (ownerId) {
      const member = await db.workspaceMember.findFirst({
        where: { workspaceId: context.workspace.id, userId: ownerId },
        select: { userId: true },
      });
      if (!member) redirect(frameworkPath(key, "Owner is not a workspace member"));
      data.ownerId = ownerId;
    } else {
      data.ownerId = null;
    }
  }

  if (formData.has("dueDate")) {
    const raw = String(formData.get("dueDate") ?? "");
    if (raw) {
      const parsed = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) redirect(frameworkPath(key, "Invalid due date"));
      data.dueDate = parsed;
    } else {
      data.dueDate = null;
    }
  }

  if (formData.has("reviewFrequency")) {
    const review = String(formData.get("reviewFrequency") ?? "");
    if (review && !REVIEWS.has(review)) redirect(frameworkPath(key, "Invalid review frequency"));
    data.reviewFrequency = review || null;
  }

  const existing = await db.workspaceControl.findUnique({
    where: { workspaceId_controlId: { workspaceId: context.workspace.id, controlId } },
    select: { status: true },
  });

  const state = await db.workspaceControl.upsert({
    where: { workspaceId_controlId: { workspaceId: context.workspace.id, controlId } },
    update: data,
    create: {
      workspaceId: context.workspace.id,
      controlId,
      status: (data.status as ControlStatus | undefined) ?? "NOT_STARTED",
      ownerId: data.ownerId as string | null | undefined,
      dueDate: data.dueDate as Date | null | undefined,
      reviewFrequency: data.reviewFrequency as string | null | undefined,
    },
  });

  const statusChanged = existing?.status !== state.status;
  if (statusChanged) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "framework_control.status_changed",
      entityType: "Control",
      entityId: control.id,
      summary: `${control.ref} set to ${state.status.replaceAll("_", " ").toLowerCase()}`,
      detail: control.title,
    });
  } else {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "framework_control.updated",
      entityType: "Control",
      entityId: control.id,
      summary: `${control.ref} ownership or review details updated`,
      detail: control.title,
    });
  }

  for (const path of [
    frameworkPath(key),
    "/controls",
    "/readiness",
    "/dashboard",
    "/activity",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/frameworks/[key]", "page");
}

export async function setCyberEssentialsStatusAction(formData: FormData) {
  const context = await getWorkspaceContext();
  const controlId = String(formData.get("controlId") ?? "");
  const status = String(formData.get("status") ?? "") as ControlStatus;
  const tab = formData.get("tab") === "plus" ? "plus" : "base";
  const target = `/cyber-essentials?${tab === "plus" ? "tab=plus&" : ""}saved=1`;

  if (!canWrite(context.role)) redirect(target);
  if (!STATUSES.includes(status)) redirect(target);

  const control = await db.frameworkControl.findFirst({
    where: { id: controlId, framework: { key: "cyber-essentials" } },
    select: { id: true, ref: true, title: true },
  });
  if (!control) redirect(target);

  const existing = await db.workspaceControl.findUnique({
    where: { workspaceId_controlId: { workspaceId: context.workspace.id, controlId } },
    select: { status: true },
  });

  await db.workspaceControl.upsert({
    where: { workspaceId_controlId: { workspaceId: context.workspace.id, controlId } },
    update: { status },
    create: { workspaceId: context.workspace.id, controlId, status },
  });

  if (existing?.status !== status) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "control.status_changed",
      entityType: "Control",
      entityId: control.id,
      summary: `${control.ref} set to ${status.replaceAll("_", " ").toLowerCase()} (Cyber Essentials)`,
      detail: control.title,
    });
  }

  revalidatePath("/cyber-essentials");
  revalidatePath("/controls");
  revalidatePath("/readiness");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

export async function toggleIsoEvidenceReuseAction(formData: FormData) {
  const context = await getWorkspaceContext();
  const key = String(formData.get("frameworkKey") ?? "");
  if (!canWrite(context.role)) redirect(frameworkPath(key, "Read-only role"));

  const workspace = await db.workspace.findUnique({
    where: { id: context.workspace.id },
    select: { reuseIsoEvidence: true },
  });
  const next = !(workspace?.reuseIsoEvidence ?? false);
  await db.workspace.update({
    where: { id: context.workspace.id },
    data: { reuseIsoEvidence: next },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: next ? "framework_control.evidence_reuse_enabled" : "framework_control.evidence_reuse_disabled",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: next ? "Enabled reuse of ISO 27001 evidence across framework packs" : "Disabled reuse of ISO 27001 evidence",
  });

  revalidatePath(frameworkPath(key));
  revalidatePath("/evidence");
}
