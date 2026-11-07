import "server-only";
import { db } from "@/lib/db";
import type { ControlStatus, Prisma } from "@prisma/client";

export async function listControls(
  workspaceId: string,
  filters: { framework?: string; category?: string; status?: ControlStatus | "ALL"; q?: string } = {},
) {
  const where: Prisma.WorkspaceControlWhereInput = { workspaceId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.framework || filters.category || filters.q) {
    where.control = {};
    if (filters.framework) where.control.framework = { key: filters.framework };
    if (filters.category) where.control.category = filters.category;
    if (filters.q) {
      where.control.OR = [
        { ref: { contains: filters.q, mode: "insensitive" } },
        { title: { contains: filters.q, mode: "insensitive" } },
      ];
    }
  }

  return db.workspaceControl.findMany({
    where,
    include: {
      control: {
        include: {
          framework: { select: { key: true, name: true } },
          policies: {
            where: { policy: { workspaceId } },
            select: { policyId: true },
          },
          risks: {
            where: { risk: { workspaceId } },
            select: { riskId: true },
          },
          evidence: {
            where: { workspaceId },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { control: { sortOrder: "asc" } },
  });
}

export async function controlMeta(workspaceId: string) {
  const rows = await db.workspaceControl.findMany({
    where: { workspaceId },
    select: {
      status: true,
      control: { select: { category: true, framework: { select: { key: true, name: true } } } },
    },
  });
  const frameworks = Array.from(
    new Map(rows.map((row) => [row.control.framework.key, row.control.framework.name])).entries(),
  ).map(([key, name]) => ({ key, name }));
  const categories = Array.from(new Set(rows.map((row) => row.control.category))).sort();
  return { frameworks, categories };
}

export async function coverage(workspaceId: string) {
  const grouped = await db.workspaceControl.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
  });
  const counts: Record<ControlStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    IMPLEMENTED: 0,
    NOT_APPLICABLE: 0,
  };
  for (const row of grouped) counts[row.status] = row._count._all;
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const applicable = total - counts.NOT_APPLICABLE;
  const percent = applicable > 0 ? Math.round((counts.IMPLEMENTED / applicable) * 100) : 0;
  return { ...counts, total, applicable, percent };
}

export async function updateControlStatus(workspaceId: string, controlId: string, status: ControlStatus) {
  const result = await db.workspaceControl.updateMany({
    where: { workspaceId, controlId },
    data: { status },
  });
  return result.count > 0;
}

export async function controlOptions(workspaceId: string) {
  return db.workspaceControl.findMany({
    where: { workspaceId },
    select: {
      control: {
        select: {
          id: true,
          ref: true,
          title: true,
          category: true,
          framework: { select: { name: true, key: true } },
        },
      },
    },
    orderBy: { control: { sortOrder: "asc" } },
  });
}
