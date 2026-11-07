import "server-only";
import { revalidateTag } from "next/cache";
import { WORKSPACE_DATA_TAG } from "@/lib/cache";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const ENTITY_TYPES = [
  "Policy",
  "Risk",
  "Evidence",
  "Control",
  "Workspace",
  "Member",
  "Profile",
  "Context",
  "Scope",
  "Methodology",
  "Objective",
  "IsmsRole",
  "InternalAudit",
  "ManagementReview",
  "Training",
  "Supplier",
  "Incident",
  "CorrectiveAction",
  "Asset",
  "Impact",
  "Measurement",
  "Scan",
  "Integration",
  "AiSystem",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export function isEntityType(value: string | undefined): value is EntityType {
  return Boolean(value && (ENTITY_TYPES as readonly string[]).includes(value));
}

export type ActivityInput = {
  workspaceId: string;
  actor: { id: string; name: string } | null;
  action: string;
  entityType: EntityType;
  entityId?: string | null;
  summary: string;
  detail?: string | null;
};

/**
 * Append an immutable audit event. Logging must never break the mutation that
 * produced it, so failures are reported but not rethrown.
 */
export async function recordActivity(input: ActivityInput) {
  // Every mutation funnels through here before it returns, so this is the one
  // place that needs to clear cached dashboards and readiness reports. It can
  // run outside a request (for example during seeding), where invalidation is
  // meaningless, so failure is non-fatal.
  try {
    revalidateTag(WORKSPACE_DATA_TAG);
  } catch {
    // No request cache to invalidate.
  }

  try {
    await db.auditEvent.create({
      data: {
        workspaceId: input.workspaceId,
        actorId: input.actor?.id ?? null,
        actorName: input.actor?.name ?? "System",
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    console.error("audit_event_failed", error);
  }
}

export async function listActivity(
  workspaceId: string,
  filters: { entityType?: EntityType | "ALL"; actorName?: string; q?: string; take?: number; skip?: number } = {},
) {
  const where: Prisma.AuditEventWhereInput = { workspaceId };
  if (filters.entityType && filters.entityType !== "ALL") where.entityType = filters.entityType;
  if (filters.actorName) where.actorName = filters.actorName;
  if (filters.q) {
    where.OR = [
      { summary: { contains: filters.q, mode: "insensitive" } },
      { detail: { contains: filters.q, mode: "insensitive" } },
      { actorName: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.auditEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 60,
    skip: filters.skip ?? 0,
  });
}

export async function countActivity(workspaceId: string, filters: { entityType?: EntityType | "ALL"; actorName?: string; q?: string } = {}) {
  const where: Prisma.AuditEventWhereInput = { workspaceId };
  if (filters.entityType && filters.entityType !== "ALL") where.entityType = filters.entityType;
  if (filters.actorName) where.actorName = filters.actorName;
  if (filters.q) {
    where.OR = [
      { summary: { contains: filters.q, mode: "insensitive" } },
      { detail: { contains: filters.q, mode: "insensitive" } },
      { actorName: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return db.auditEvent.count({ where });
}

export async function activityActors(workspaceId: string) {
  const rows = await db.auditEvent.groupBy({
    by: ["actorName"],
    where: { workspaceId },
    _count: { _all: true },
  });
  return rows
    .map((row) => ({ name: row.actorName, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function activityStats(workspaceId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [total, recent, byType] = await Promise.all([
    db.auditEvent.count({ where: { workspaceId } }),
    db.auditEvent.count({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } } }),
    db.auditEvent.groupBy({
      by: ["entityType"],
      where: { workspaceId },
      _count: { _all: true },
    }),
  ]);
  return {
    total,
    recent,
    byType: Object.fromEntries(byType.map((row) => [row.entityType, row._count._all])) as Record<string, number>,
  };
}
