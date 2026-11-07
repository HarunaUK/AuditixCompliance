"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";

const RISK_TIERS = ["PROHIBITED", "HIGH", "LIMITED", "MINIMAL"];
const LIFECYCLES = ["PILOT", "PRODUCTION", "RETIRED"];
const OUTCOMES = ["APPROVED", "CONDITIONAL", "REJECTED", "DEFERRED"];

function back(path: string, message?: string) {
  return message ? `${path}?error=${encodeURIComponent(message)}` : `${path}?saved=1`;
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function date(formData: FormData, name: string) {
  const raw = text(formData, name);
  return raw ? new Date(`${raw}T00:00:00.000Z`) : null;
}

function score(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : 3;
}

async function memberId(workspaceId: string, userId: string) {
  if (!userId) return null;
  const member = await db.workspaceMember.findFirst({ where: { workspaceId, userId }, select: { userId: true } });
  return member?.userId ?? null;
}

export async function createAiSystemAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/aims/systems", "Read-only role"));

  const name = text(formData, "name");
  if (!name) redirect(back("/aims/systems", "Name the AI system"));

  const riskTier = text(formData, "riskTier");
  const lifecycle = text(formData, "lifecycle");
  const ownerId = await memberId(context.workspace.id, text(formData, "ownerId"));

  const system = await db.aiSystem.create({
    data: {
      workspaceId: context.workspace.id,
      name,
      vendor: text(formData, "vendor") || null,
      purpose: text(formData, "purpose") || null,
      modelType: text(formData, "modelType") || "Foundation model",
      riskTier: RISK_TIERS.includes(riskTier) ? riskTier : "LIMITED",
      lifecycle: LIFECYCLES.includes(lifecycle) ? lifecycle : "PILOT",
      ownerId,
      dataTypes: text(formData, "dataTypes") || null,
      humanOversight: text(formData, "humanOversight") || null,
      nextReviewAt: date(formData, "nextReviewAt"),
      notes: text(formData, "notes") || null,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "ai.system_created",
    entityType: "AiSystem",
    entityId: system.id,
    summary: `AI system "${system.name}" added to the inventory`,
    detail: `${system.riskTier} risk · ${system.lifecycle.toLowerCase()}`,
  });

  for (const path of ["/aims", "/aims/systems", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function updateAiSystemAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/aims/systems", "Read-only role"));

  const id = text(formData, "id");
  const existing = await db.aiSystem.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!existing) redirect(back("/aims/systems", "AI system not found"));

  const riskTier = text(formData, "riskTier");
  const lifecycle = text(formData, "lifecycle");
  const ownerId = await memberId(context.workspace.id, text(formData, "ownerId"));

  await db.aiSystem.update({
    where: { id: existing.id },
    data: {
      riskTier: RISK_TIERS.includes(riskTier) ? riskTier : existing.riskTier,
      lifecycle: LIFECYCLES.includes(lifecycle) ? lifecycle : existing.lifecycle,
      ownerId,
      nextReviewAt: formData.has("nextReviewAt") ? date(formData, "nextReviewAt") : existing.nextReviewAt,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "ai.system_updated",
    entityType: "AiSystem",
    entityId: existing.id,
    summary: `AI system "${existing.name}" updated`,
    detail: `${riskTier} risk · ${lifecycle.toLowerCase()}`,
  });

  for (const path of ["/aims", "/aims/systems", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function deleteAiSystemAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/aims/systems", "Read-only role"));

  const id = text(formData, "id");
  const system = await db.aiSystem.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!system) redirect(back("/aims/systems", "AI system not found"));

  await db.aiSystem.delete({ where: { id: system.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "ai.system_deleted",
    entityType: "AiSystem",
    entityId: system.id,
    summary: `AI system "${system.name}" removed from the inventory`,
  });

  for (const path of ["/aims", "/aims/systems", "/aims/impact", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function createAiAssessmentAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/aims/impact", "Read-only role"));

  const systemId = text(formData, "systemId");
  const system = await db.aiSystem.findFirst({ where: { id: systemId, workspaceId: context.workspace.id } });
  if (!system) redirect(back("/aims/impact", "Choose an AI system"));

  const title = text(formData, "title");
  if (!title) redirect(back("/aims/impact", "Give the assessment a title"));

  const outcome = text(formData, "outcome");
  const assessment = await db.aiImpactAssessment.create({
    data: {
      workspaceId: context.workspace.id,
      systemId: system.id,
      title,
      scope: text(formData, "scope") || null,
      findings: text(formData, "findings") || null,
      individualsImpact: score(formData, "individualsImpact"),
      societalImpact: score(formData, "societalImpact"),
      outcome: OUTCOMES.includes(outcome) ? outcome : "DEFERRED",
      mitigations: text(formData, "mitigations") || null,
      approvedAt: date(formData, "approvedAt"),
      nextReviewAt: date(formData, "nextReviewAt"),
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "ai.impact_assessed",
    entityType: "AiSystem",
    entityId: system.id,
    summary: `Impact assessment recorded for ${system.name}`,
    detail: `${assessment.outcome.replaceAll("_", " ").toLowerCase()} · ${assessment.title}`,
  });

  for (const path of ["/aims", "/aims/impact", "/dashboard", "/activity"]) revalidatePath(path);
}

export async function deleteAiAssessmentAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(back("/aims/impact", "Read-only role"));

  const id = text(formData, "id");
  const assessment = await db.aiImpactAssessment.findFirst({
    where: { id, workspaceId: context.workspace.id },
    include: { system: { select: { name: true } } },
  });
  if (!assessment) redirect(back("/aims/impact", "Assessment not found"));

  await db.aiImpactAssessment.delete({ where: { id: assessment.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "ai.impact_deleted",
    entityType: "AiSystem",
    entityId: assessment.systemId,
    summary: `Impact assessment removed for ${assessment.system.name}`,
    detail: assessment.title,
  });

  for (const path of ["/aims", "/aims/impact", "/dashboard", "/activity"]) revalidatePath(path);
}
