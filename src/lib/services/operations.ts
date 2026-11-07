import "server-only";
import { db } from "@/lib/db";
import type {
  ActionPriority,
  ActionSource,
  ActionStatus,
  IncidentSeverity,
  IncidentStatus,
  Prisma,
  SupplierCriticality,
  SupplierStatus,
} from "@prisma/client";

export const OPEN_INCIDENT_STATUSES: IncidentStatus[] = ["OPEN", "INVESTIGATING", "CONTAINED"];
export const OPEN_ACTION_STATUSES: ActionStatus[] = ["OPEN", "IN_PROGRESS"];

const DAY_MS = 86_400_000;

export async function listSuppliers(
  workspaceId: string,
  filters: { q?: string; criticality?: SupplierCriticality | "ALL"; status?: SupplierStatus | "ALL" } = {},
) {
  const where: Prisma.SupplierWhereInput = { workspaceId };
  if (filters.criticality && filters.criticality !== "ALL") where.criticality = filters.criticality;
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { service: { contains: filters.q, mode: "insensitive" } },
      { category: { contains: filters.q, mode: "insensitive" } },
      { assurance: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.supplier.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { incidents: true, correctiveActions: true } },
    },
    orderBy: [{ criticality: "asc" }, { nextReviewAt: "asc" }, { name: "asc" }],
  });
}

export async function supplierSummary(workspaceId: string) {
  const inThirtyDays = new Date(Date.now() + 30 * DAY_MS);
  const suppliers = await db.supplier.findMany({
    where: { workspaceId },
    select: {
      criticality: true,
      status: true,
      dataAccess: true,
      dpaSigned: true,
      nextReviewAt: true,
    },
  });
  const live = suppliers.filter((supplier) => supplier.status === "ACTIVE" || supplier.status === "UNDER_REVIEW");
  return {
    total: suppliers.length,
    active: live.length,
    critical: live.filter((supplier) => supplier.criticality === "CRITICAL").length,
    high: live.filter((supplier) => supplier.criticality === "HIGH").length,
    reviewsDue: live.filter((supplier) => supplier.nextReviewAt && supplier.nextReviewAt <= inThirtyDays).length,
    missingReview: live.filter((supplier) => !supplier.nextReviewAt).length,
    dataProcessors: live.filter((supplier) => supplier.dataAccess).length,
    dpaGaps: live.filter((supplier) => supplier.dataAccess && !supplier.dpaSigned).length,
  };
}

export async function listIncidents(
  workspaceId: string,
  filters: { q?: string; status?: IncidentStatus | "ALL"; severity?: IncidentSeverity | "ALL" } = {},
) {
  const where: Prisma.IncidentWhereInput = { workspaceId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.severity && filters.severity !== "ALL") where.severity = filters.severity;
  if (filters.q) {
    where.OR = [
      { reference: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { reportedBy: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.incident.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      _count: { select: { correctiveActions: true, updates: true } },
    },
    orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
  });
}

export async function incidentSummary(workspaceId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);
  const incidents = await db.incident.findMany({
    where: { workspaceId },
    select: { status: true, severity: true, detectedAt: true, resolvedAt: true },
  });
  const open = incidents.filter((incident) => OPEN_INCIDENT_STATUSES.includes(incident.status));
  return {
    total: incidents.length,
    open: open.length,
    critical: open.filter((incident) => incident.severity === "CRITICAL").length,
    high: open.filter((incident) => incident.severity === "HIGH").length,
    resolved30: incidents.filter((incident) => incident.resolvedAt && incident.resolvedAt >= thirtyDaysAgo).length,
  };
}

export async function getIncident(workspaceId: string, incidentId: string) {
  return db.incident.findFirst({
    where: { id: incidentId, workspaceId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      supplier: { select: { id: true, name: true, criticality: true, status: true } },
      updates: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      correctiveActions: {
        include: { owner: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      },
    },
  });
}

export async function listCorrectiveActions(
  workspaceId: string,
  filters: {
    q?: string;
    status?: ActionStatus | "ALL";
    source?: ActionSource | "ALL";
    priority?: ActionPriority | "ALL";
  } = {},
) {
  const where: Prisma.CorrectiveActionWhereInput = { workspaceId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.source && filters.source !== "ALL") where.source = filters.source;
  if (filters.priority && filters.priority !== "ALL") where.priority = filters.priority;
  if (filters.q) {
    where.OR = [
      { reference: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.correctiveAction.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      incident: { select: { id: true, reference: true, title: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function correctiveActionSummary(workspaceId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today.getTime() + 7 * DAY_MS);
  const actions = await db.correctiveAction.findMany({
    where: { workspaceId },
    select: { status: true, dueDate: true, verifiedAt: true },
  });
  const open = actions.filter((action) => OPEN_ACTION_STATUSES.includes(action.status));
  return {
    total: actions.length,
    open: open.length,
    overdue: open.filter((action) => action.dueDate && action.dueDate < today).length,
    dueSoon: open.filter(
      (action) => action.dueDate && action.dueDate >= today && action.dueDate <= inSevenDays,
    ).length,
    verified: actions.filter((action) => action.status === "VERIFIED").length,
  };
}

async function nextReference(workspaceId: string, prefix: "INC" | "CA") {
  let last: string | undefined;
  if (prefix === "INC") {
    const rows = await db.incident.findMany({
      where: { workspaceId, reference: { startsWith: "INC-" } },
      select: { reference: true },
      orderBy: { reference: "desc" },
      take: 1,
    });
    last = rows[0]?.reference;
  } else {
    const rows = await db.correctiveAction.findMany({
      where: { workspaceId, reference: { startsWith: "CA-" } },
      select: { reference: true },
      orderBy: { reference: "desc" },
      take: 1,
    });
    last = rows[0]?.reference;
  }
  const next = last ? Number.parseInt(last.slice(prefix.length + 1), 10) + 1 : 1;
  return `${prefix}-${String(Number.isFinite(next) ? next : 1).padStart(4, "0")}`;
}

export function nextIncidentReference(workspaceId: string) {
  return nextReference(workspaceId, "INC");
}

export function nextCorrectiveActionReference(workspaceId: string) {
  return nextReference(workspaceId, "CA");
}

export function supplierReviewDue(supplier: { nextReviewAt: Date | null; status: SupplierStatus }) {
  if (supplier.status === "EXITED") return null;
  if (!supplier.nextReviewAt) return "missing" as const;
  const days = Math.ceil((supplier.nextReviewAt.getTime() - Date.now()) / DAY_MS);
  if (days < 0) return "overdue" as const;
  if (days <= 30) return "due" as const;
  return "current" as const;
}

export function actionOverdue(action: { status: ActionStatus; dueDate: Date | null }) {
  return Boolean(
    OPEN_ACTION_STATUSES.includes(action.status) && action.dueDate && action.dueDate.getTime() < new Date().setHours(0, 0, 0, 0),
  );
}

export type IncidentListItem = Awaited<ReturnType<typeof listIncidents>>[number];
export type CorrectiveActionListItem = Awaited<ReturnType<typeof listCorrectiveActions>>[number];
