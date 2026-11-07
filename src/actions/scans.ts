"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";

const KINDS = new Set(["WEB", "INFRA", "CLOUD"]);

export async function createScanAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/scans?error=Read-only+role");

  const target = String(formData.get("target") ?? "").trim();
  const kind = String(formData.get("kind") ?? "WEB");
  if (!target) redirect("/scans?error=Enter+an+asset+or+URL");
  if (!KINDS.has(kind)) redirect("/scans?error=Unknown+scan+type");

  const scan = await db.vulnerabilityScan.create({
    data: {
      workspaceId: context.workspace.id,
      target,
      kind,
      status: "QUEUED",
      requestedBy: context.user.name,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scan.queued",
    entityType: "Workspace",
    entityId: scan.id,
    summary: `Queued a ${kind.toLowerCase()} scan for ${target}`,
  });

  revalidatePath("/scans");
}

export async function recordScanResultAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/scans?error=Read-only+role");
  const id = String(formData.get("id") ?? "");

  const scan = await db.vulnerabilityScan.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true, target: true, status: true },
  });
  if (!scan) redirect("/scans?error=Unknown+scan");

  const count = (name: string) => {
    const value = Number.parseInt(String(formData.get(name) ?? "0"), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const critical = count("critical");
  const high = count("high");
  const medium = count("medium");
  const low = count("low");
  const findings = critical + high + medium + low;

  await db.vulnerabilityScan.update({
    where: { id: scan.id },
    data: {
      status: "COMPLETE",
      critical,
      high,
      medium,
      low,
      findings,
      startedAt: scan.status === "QUEUED" ? new Date() : undefined,
      completedAt: new Date(),
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scan.completed",
    entityType: "Workspace",
    entityId: scan.id,
    summary: `Recorded ${findings} finding${findings === 1 ? "" : "s"} for ${scan.target}`,
    detail: `${critical} critical · ${high} high · ${medium} medium · ${low} low`,
  });

  revalidatePath("/scans");
}

export async function deleteScanAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/scans?error=Read-only+role");
  const id = String(formData.get("id") ?? "");

  const scan = await db.vulnerabilityScan.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true, target: true },
  });
  if (!scan) redirect("/scans?error=Unknown+scan");

  await db.vulnerabilityScan.delete({ where: { id: scan.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scan.deleted",
    entityType: "Workspace",
    entityId: scan.id,
    summary: `Removed the scan record for ${scan.target}`,
  });

  revalidatePath("/scans");
}
