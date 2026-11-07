"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";

function back(path: string, message?: string) {
  return message ? `${path}?error=${encodeURIComponent(message)}` : `${path}?saved=1`;
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function number(formData: FormData, name: string, min: number, max: number) {
  const value = Number(formData.get(name));
  if (!Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

async function memberId(workspaceId: string, userId: string) {
  if (!userId) return null;
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { userId: true },
  });
  return member?.userId ?? null;
}

const ASSET_TYPES = ["Application", "Server", "Database", "Cloud service", "Endpoint", "Network", "People", "Facility"];
const CLASSIFICATIONS = ["Public", "Internal", "Confidential", "Restricted"];

export async function createAssetAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/assets", "Read-only role"));

  const name = text(formData, "name");
  if (!name) redirect(back("/assets", "Give the asset a name"));

  const type = text(formData, "type");
  const classification = text(formData, "classification");
  const ownerId = await memberId(context.workspace.id, text(formData, "ownerId"));

  const asset = await db.asset.create({
    data: {
      workspaceId: context.workspace.id,
      name,
      type: ASSET_TYPES.includes(type) ? type : "Application",
      classification: CLASSIFICATIONS.includes(classification) ? classification : "Internal",
      location: text(formData, "location") || null,
      notes: text(formData, "notes") || null,
      inScope: formData.get("inScope") === "on",
      ownerId,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "asset.created",
    entityType: "Asset",
    entityId: asset.id,
    summary: `Asset "${asset.name}" added to the inventory`,
    detail: `${asset.type} · ${asset.classification}`,
  });

  for (const path of ["/assets", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function deleteAssetAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/assets", "Read-only role"));

  const id = text(formData, "id");
  const asset = await db.asset.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!asset) redirect(back("/assets", "Asset not found"));

  await db.asset.delete({ where: { id: asset.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "asset.deleted",
    entityType: "Asset",
    entityId: asset.id,
    summary: `Asset "${asset.name}" removed from the inventory`,
  });

  for (const path of ["/assets", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function createImpactAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/bia", "Read-only role"));

  const functionName = text(formData, "functionName");
  if (!functionName) redirect(back("/bia", "Name the business function"));

  const priority = text(formData, "priority").toUpperCase();
  const ownerId = await memberId(context.workspace.id, text(formData, "ownerId"));

  const impact = await db.businessImpactAnalysis.create({
    data: {
      workspaceId: context.workspace.id,
      functionName,
      priority: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(priority) ? priority : "MEDIUM",
      ownerId,
      rtoHours: number(formData, "rtoHours", 0, 8760),
      rpoHours: number(formData, "rpoHours", 0, 8760),
      mtpdHours: number(formData, "mtpdHours", 0, 8760),
      impactFinancial: number(formData, "impactFinancial", 1, 5) ?? 3,
      impactOperational: number(formData, "impactOperational", 1, 5) ?? 3,
      impactRegulatory: number(formData, "impactRegulatory", 1, 5) ?? 3,
      impactReputational: number(formData, "impactReputational", 1, 5) ?? 3,
      impactCustomer: number(formData, "impactCustomer", 1, 5) ?? 3,
      dependencies: text(formData, "dependencies") || null,
      recoveryResources: text(formData, "recoveryResources") || null,
      notes: text(formData, "notes") || null,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "bia.created",
    entityType: "Impact",
    entityId: impact.id,
    summary: `Business impact analysis added for ${impact.functionName}`,
    detail: `${impact.priority} priority · RTO ${impact.rtoHours ?? "—"}h`,
  });

  for (const path of ["/bia", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function deleteImpactAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/bia", "Read-only role"));

  const id = text(formData, "id");
  const impact = await db.businessImpactAnalysis.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!impact) redirect(back("/bia", "Analysis not found"));

  await db.businessImpactAnalysis.delete({ where: { id: impact.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "bia.deleted",
    entityType: "Impact",
    entityId: impact.id,
    summary: `Business impact analysis removed for ${impact.functionName}`,
  });

  for (const path of ["/bia", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function createMeasurementAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/measurements", "Read-only role"));

  const name = text(formData, "name");
  if (!name) redirect(back("/measurements", "Name the measurement"));

  const responsibleId = await memberId(context.workspace.id, text(formData, "responsibleId"));
  const measuredAt = text(formData, "lastMeasuredAt");
  const frequency = text(formData, "frequency");

  const measurement = await db.measurement.create({
    data: {
      workspaceId: context.workspace.id,
      name,
      method: text(formData, "method") || null,
      frequency: ["Monthly", "Quarterly", "Half-yearly", "Yearly"].includes(frequency) ? frequency : "Monthly",
      responsibleId,
      target: text(formData, "target") || null,
      latestResult: text(formData, "latestResult") || null,
      lastMeasuredAt: measuredAt ? new Date(`${measuredAt}T00:00:00.000Z`) : null,
      notes: text(formData, "notes") || null,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "measurement.created",
    entityType: "Measurement",
    entityId: measurement.id,
    summary: `Measurement "${measurement.name}" added`,
    detail: `${measurement.frequency} · target ${measurement.target ?? "not set"}`,
  });

  for (const path of ["/measurements", "/stage-1", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function updateMeasurementAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/measurements", "Read-only role"));

  const id = text(formData, "id");
  const existing = await db.measurement.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!existing) redirect(back("/measurements", "Measurement not found"));

  const measuredAt = text(formData, "lastMeasuredAt");
  await db.measurement.update({
    where: { id: existing.id },
    data: {
      latestResult: text(formData, "latestResult") || null,
      lastMeasuredAt: measuredAt ? new Date(`${measuredAt}T00:00:00.000Z`) : null,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "measurement.recorded",
    entityType: "Measurement",
    entityId: existing.id,
    summary: `Result recorded for "${existing.name}"`,
    detail: text(formData, "latestResult") || null,
  });

  for (const path of ["/measurements", "/stage-1", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function deleteMeasurementAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/measurements", "Read-only role"));

  const id = text(formData, "id");
  const measurement = await db.measurement.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!measurement) redirect(back("/measurements", "Measurement not found"));

  await db.measurement.delete({ where: { id: measurement.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "measurement.deleted",
    entityType: "Measurement",
    entityId: measurement.id,
    summary: `Measurement "${measurement.name}" removed`,
  });

  for (const path of ["/measurements", "/stage-1", "/dashboard", "/activity"]) revalidatePath(path);
}
