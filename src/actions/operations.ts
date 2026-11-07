"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";
import { nextCorrectiveActionReference, nextIncidentReference } from "@/lib/services/operations";
import {
  correctiveActionAdvanceSchema,
  correctiveActionSchema,
  incidentSchema,
  incidentSeveritySchema,
  incidentWorkflowSchema,
  parseDateInput,
  supplierSchema,
} from "@/lib/validation";
import type { IncidentStatus } from "@prisma/client";

const INCIDENT_ORDER: IncidentStatus[] = ["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"];

function invalid(path: string, message: string | undefined): never {
  redirect(`${path}?error=${encodeURIComponent(message ?? "Check the form and try again.")}`);
}

function revalidateOperations() {
  revalidatePath("/suppliers");
  revalidatePath("/incidents");
  revalidatePath("/corrective-actions");
  revalidatePath("/stage-1");
  revalidatePath("/readiness");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

async function resolveOwner(workspaceId: string, requested: FormDataEntryValue | null, fallback: string) {
  const ownerId = typeof requested === "string" && requested ? requested : fallback;
  const member = await db.workspaceMember.findFirst({
    where: { workspaceId, userId: ownerId },
    select: { userId: true },
  });
  return member?.userId ?? fallback;
}

function dateFromInput(value: string | undefined) {
  const date = parseDateInput(value);
  if (!date) return null;
  date.setHours(12, 0, 0, 0);
  return date;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function createSupplierAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/suppliers", "Your role is read-only.");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    service: formData.get("service"),
    category: formData.get("category"),
    criticality: formData.get("criticality"),
    status: formData.get("status"),
    ownerId: formData.get("ownerId"),
    dataAccess: formData.get("dataAccess"),
    dpaSigned: formData.get("dpaSigned"),
    assurance: formData.get("assurance"),
    lastReviewedAt: formData.get("lastReviewedAt"),
    nextReviewAt: formData.get("nextReviewAt"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) invalid("/suppliers", parsed.error.issues[0]?.message);

  const ownerId = await resolveOwner(context.workspace.id, formData.get("ownerId"), context.user.id);
  const supplier = await db.supplier.create({
    data: {
      workspaceId: context.workspace.id,
      name: parsed.data.name,
      service: parsed.data.service,
      category: parsed.data.category,
      criticality: parsed.data.criticality,
      status: parsed.data.status,
      ownerId,
      dataAccess: parsed.data.dataAccess,
      dpaSigned: parsed.data.dpaSigned,
      assurance: parsed.data.assurance || null,
      lastReviewedAt: dateFromInput(parsed.data.lastReviewedAt),
      nextReviewAt: dateFromInput(parsed.data.nextReviewAt),
      notes: parsed.data.notes || null,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "supplier.created",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `Added supplier “${supplier.name}” to the register`,
    detail: `${supplier.criticality.toLowerCase()} criticality · ${supplier.category}`,
  });

  revalidateOperations();
  redirect("/suppliers?saved=1");
}

export async function reviewSupplierAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/suppliers", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const supplier = await db.supplier.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!supplier) invalid("/suppliers", "That supplier was not found in this workspace.");

  const now = new Date();
  const cadence = supplier.criticality === "CRITICAL" || supplier.criticality === "HIGH" ? 6 : 12;
  await db.supplier.update({
    where: { id: supplier.id },
    data: {
      lastReviewedAt: now,
      nextReviewAt: addMonths(now, cadence),
      status: supplier.status === "UNDER_REVIEW" ? "ACTIVE" : supplier.status,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "supplier.reviewed",
    entityType: "Supplier",
    entityId: supplier.id,
    summary: `Reviewed supplier “${supplier.name}”`,
    detail: `Next review in ${cadence} months · ${supplier.criticality.toLowerCase()} criticality`,
  });

  revalidateOperations();
  redirect("/suppliers?reviewed=1");
}

export async function reportIncidentAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/incidents", "Your role is read-only.");

  const parsed = incidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    severity: formData.get("severity"),
    ownerId: formData.get("ownerId"),
    detectedAt: formData.get("detectedAt"),
    reportedBy: formData.get("reportedBy"),
    supplierId: formData.get("supplierId"),
    impact: formData.get("impact"),
    rootCause: formData.get("rootCause") ?? "",
  });
  if (!parsed.success) invalid("/incidents", parsed.error.issues[0]?.message);

  const detectedAt = dateFromInput(parsed.data.detectedAt);
  if (!detectedAt) invalid("/incidents", "Enter a valid detection date.");

  let supplierId: string | null = null;
  if (parsed.data.supplierId) {
    const supplier = await db.supplier.findFirst({
      where: { id: parsed.data.supplierId, workspaceId: context.workspace.id },
      select: { id: true },
    });
    if (!supplier) invalid("/incidents", "That supplier was not found in this workspace.");
    supplierId = supplier.id;
  }

  const ownerId = await resolveOwner(context.workspace.id, formData.get("ownerId"), context.user.id);
  const reference = await nextIncidentReference(context.workspace.id);
  const incident = await db.incident.create({
    data: {
      workspaceId: context.workspace.id,
      reference,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      severity: parsed.data.severity,
      status: "OPEN",
      ownerId,
      detectedAt,
      supplierId,
      reportedBy: parsed.data.reportedBy || context.user.name,
      impact: parsed.data.impact || null,
      rootCause: parsed.data.rootCause || null,
      updates: {
        create: {
          actorId: context.user.id,
          actorName: context.user.name,
          status: "OPEN",
          note: "Incident reported and added to the register.",
        },
      },
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "incident.reported",
    entityType: "Incident",
    entityId: incident.id,
    summary: `Reported ${incident.reference} “${incident.title}”`,
    detail: `${incident.severity.toLowerCase()} severity · ${incident.category.replaceAll("_", " ").toLowerCase()}`,
  });

  revalidateOperations();
  redirect(`/incidents/${incident.id}?saved=1`);
}

export async function advanceIncidentAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/incidents", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const returnPath = `/incidents/${id}`;

  const parsed = incidentWorkflowSchema.safeParse({
    status: formData.get("status"),
    note: formData.get("note"),
    resolution: formData.get("resolution") ?? "",
  });
  if (!parsed.success) invalid(returnPath, parsed.error.issues[0]?.message);

  const incident = await db.incident.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!incident) invalid("/incidents", "That incident was not found in this workspace.");

  const currentIndex = INCIDENT_ORDER.indexOf(incident.status);
  const nextIndex = INCIDENT_ORDER.indexOf(parsed.data.status);
  if (nextIndex <= currentIndex) {
    invalid(returnPath, "The incident is already at or beyond that stage.");
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.incident.update({
      where: { id: incident.id },
      data: {
        status: parsed.data.status,
        containedAt: parsed.data.status === "CONTAINED" ? (incident.containedAt ?? now) : incident.containedAt,
        resolvedAt:
          parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
            ? (incident.resolvedAt ?? now)
            : incident.resolvedAt,
        resolution: parsed.data.resolution || incident.resolution,
      },
    });
    await tx.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        actorId: context.user.id,
        actorName: context.user.name,
        status: parsed.data.status,
        note: parsed.data.note,
      },
    });
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "incident.status_changed",
    entityType: "Incident",
    entityId: incident.id,
    summary: `${incident.reference} moved to ${parsed.data.status.replaceAll("_", " ").toLowerCase()}`,
    detail: parsed.data.note,
  });

  revalidateOperations();
  redirect(`${returnPath}?saved=1`);
}

export async function updateIncidentSeverityAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/incidents", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const returnPath = `/incidents/${id}`;
  const parsed = incidentSeveritySchema.safeParse({ severity: formData.get("severity") });
  if (!parsed.success) invalid(returnPath, parsed.error.issues[0]?.message);

  const incident = await db.incident.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!incident) invalid("/incidents", "That incident was not found in this workspace.");
  if (incident.severity === parsed.data.severity) invalid(returnPath, "That is already the severity.");

  await db.$transaction(async (tx) => {
    await tx.incident.update({ where: { id: incident.id }, data: { severity: parsed.data.severity } });
    await tx.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        actorId: context.user.id,
        actorName: context.user.name,
        status: incident.status,
        note: `Severity changed from ${incident.severity.toLowerCase()} to ${parsed.data.severity.toLowerCase()}.`,
      },
    });
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "incident.severity_changed",
    entityType: "Incident",
    entityId: incident.id,
    summary: `${incident.reference} severity set to ${parsed.data.severity.toLowerCase()}`,
    detail: `Previously ${incident.severity.toLowerCase()}`,
  });

  revalidateOperations();
  redirect(`${returnPath}?saved=1`);
}

export async function createCorrectiveActionAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/corrective-actions", "Your role is read-only.");

  const parsed = correctiveActionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    source: formData.get("source"),
    priority: formData.get("priority"),
    ownerId: formData.get("ownerId"),
    dueDate: formData.get("dueDate"),
    incidentId: formData.get("incidentId"),
    supplierId: formData.get("supplierId"),
  });
  if (!parsed.success) invalid("/corrective-actions", parsed.error.issues[0]?.message);

  let incidentId: string | null = null;
  if (parsed.data.incidentId) {
    const incident = await db.incident.findFirst({
      where: { id: parsed.data.incidentId, workspaceId: context.workspace.id },
      select: { id: true },
    });
    if (!incident) invalid("/corrective-actions", "That incident was not found in this workspace.");
    incidentId = incident.id;
  }

  let supplierId: string | null = null;
  if (parsed.data.supplierId) {
    const supplier = await db.supplier.findFirst({
      where: { id: parsed.data.supplierId, workspaceId: context.workspace.id },
      select: { id: true },
    });
    if (!supplier) invalid("/corrective-actions", "That supplier was not found in this workspace.");
    supplierId = supplier.id;
  }

  const ownerId = await resolveOwner(context.workspace.id, formData.get("ownerId"), context.user.id);
  const reference = await nextCorrectiveActionReference(context.workspace.id);
  const action = await db.correctiveAction.create({
    data: {
      workspaceId: context.workspace.id,
      reference,
      title: parsed.data.title,
      description: parsed.data.description,
      source: parsed.data.source,
      priority: parsed.data.priority,
      ownerId,
      dueDate: dateFromInput(parsed.data.dueDate),
      incidentId,
      supplierId,
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "corrective_action.created",
    entityType: "CorrectiveAction",
    entityId: action.id,
    summary: `Raised corrective action ${action.reference} “${action.title}”`,
    detail: `${parsed.data.priority.toLowerCase()} priority · ${parsed.data.source.replaceAll("_", " ").toLowerCase()}`,
  });

  revalidateOperations();
  redirect(incidentId ? `/incidents/${incidentId}?saved=1` : "/corrective-actions?saved=1");
}

export async function advanceCorrectiveActionAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/corrective-actions", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const parsed = correctiveActionAdvanceSchema.safeParse({
    action: formData.get("action"),
    effectivenessNote: formData.get("effectivenessNote") ?? "",
  });
  if (!parsed.success) invalid("/corrective-actions", parsed.error.issues[0]?.message);

  const action = await db.correctiveAction.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!action) invalid("/corrective-actions", "That corrective action was not found in this workspace.");

  if (parsed.data.action === "START") {
    if (action.status !== "OPEN") invalid("/corrective-actions", "Only an open action can be started.");
    await db.correctiveAction.update({ where: { id: action.id }, data: { status: "IN_PROGRESS" } });
  } else if (parsed.data.action === "COMPLETE") {
    if (action.status !== "OPEN" && action.status !== "IN_PROGRESS") {
      invalid("/corrective-actions", "That action is already complete.");
    }
    await db.correctiveAction.update({
      where: { id: action.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  } else {
    if (action.status !== "COMPLETED") invalid("/corrective-actions", "Only a completed action can be verified.");
    if (!parsed.data.effectivenessNote || parsed.data.effectivenessNote.length < 10) {
      invalid("/corrective-actions", "Record how effectiveness was checked (at least 10 characters).");
    }
    await db.correctiveAction.update({
      where: { id: action.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
        effectivenessNote: parsed.data.effectivenessNote,
      },
    });
  }

  const updated = await db.correctiveAction.findUnique({ where: { id: action.id }, select: { status: true } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "corrective_action.status_changed",
    entityType: "CorrectiveAction",
    entityId: action.id,
    summary: `${action.reference} moved to ${(updated?.status ?? action.status).replaceAll("_", " ").toLowerCase()}`,
    detail: parsed.data.effectivenessNote || action.title,
  });

  revalidateOperations();
  if (action.incidentId) revalidatePath(`/incidents/${action.incidentId}`);
  redirect("/corrective-actions?saved=1");
}
