import "server-only";
import { db } from "@/lib/db";
import type { riskActionSchema, riskSchema } from "@/lib/validation";
import type { z } from "zod";
import type { Prisma, RiskStatus, Treatment } from "@prisma/client";

export type RiskInput = z.infer<typeof riskSchema>;
export type RiskActionInput = z.infer<typeof riskActionSchema>;

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listRisks(
  workspaceId: string,
  filters: { status?: RiskStatus | "ALL"; treatment?: Treatment | "ALL"; q?: string } = {},
) {
  const where: Prisma.RiskWhereInput = { workspaceId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.treatment && filters.treatment !== "ALL") where.treatment = filters.treatment;
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { category: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.risk.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      _count: { select: { controls: true, actions: true, evidence: true } },
    },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
  });
}

export async function riskSummary(workspaceId: string) {
  const risks = await db.risk.findMany({
    where: { workspaceId },
    select: { score: true, status: true, treatment: true, dueDate: true },
  });
  return {
    total: risks.length,
    open: risks.filter((risk) => risk.status === "OPEN").length,
    critical: risks.filter((risk) => risk.score >= 20).length,
    high: risks.filter((risk) => risk.score >= 12 && risk.score < 20).length,
    accepted: risks.filter((risk) => risk.treatment === "ACCEPT").length,
    overdue: risks.filter((risk) => risk.dueDate && risk.dueDate < new Date() && risk.status !== "CLOSED" && risk.status !== "MITIGATED").length,
  };
}

export async function getRisk(workspaceId: string, riskId: string) {
  return db.risk.findFirst({
    where: { id: riskId, workspaceId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      controls: {
        include: { control: { include: { framework: { select: { name: true, key: true } } } } },
      },
      actions: {
        include: { owner: { select: { name: true } } },
        orderBy: [{ done: "asc" }, { dueDate: "asc" }],
      },
      evidence: {
        select: { id: true, name: true, fileName: true, mimeType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function createRisk(workspaceId: string, ownerId: string, input: RiskInput) {
  return db.risk.create({
    data: {
      workspaceId,
      title: input.title,
      description: input.description,
      category: input.category,
      likelihood: input.likelihood,
      impact: input.impact,
      score: input.likelihood * input.impact,
      treatment: input.treatment,
      status: input.status,
      ownerId,
      dueDate: optionalDate(input.dueDate),
      controls: { create: input.controlIds.map((controlId) => ({ controlId })) },
    },
  });
}

export async function updateRisk(workspaceId: string, riskId: string, ownerId: string, input: RiskInput) {
  const existing = await db.risk.findFirst({ where: { id: riskId, workspaceId }, select: { id: true } });
  if (!existing) return null;
  return db.$transaction(async (tx) => {
    await tx.riskControl.deleteMany({ where: { riskId } });
    return tx.risk.update({
      where: { id: riskId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        likelihood: input.likelihood,
        impact: input.impact,
        score: input.likelihood * input.impact,
        treatment: input.treatment,
        status: input.status,
        ownerId,
        dueDate: optionalDate(input.dueDate),
        controls: { create: input.controlIds.map((controlId) => ({ controlId })) },
      },
    });
  });
}

export async function deleteRisk(workspaceId: string, riskId: string) {
  const existing = await db.risk.findFirst({ where: { id: riskId, workspaceId }, select: { id: true } });
  if (!existing) return false;
  await db.risk.delete({ where: { id: riskId } });
  return true;
}

export async function addRiskAction(workspaceId: string, riskId: string, actorId: string, input: RiskActionInput) {
  const risk = await db.risk.findFirst({ where: { id: riskId, workspaceId }, select: { id: true } });
  if (!risk) return null;
  return db.riskAction.create({
    data: { riskId, title: input.title, dueDate: optionalDate(input.dueDate), ownerId: actorId },
  });
}

export async function toggleRiskAction(workspaceId: string, actionId: string) {
  const action = await db.riskAction.findFirst({
    where: { id: actionId, risk: { workspaceId } },
    select: { id: true, done: true },
  });
  if (!action) return null;
  return db.riskAction.update({ where: { id: action.id }, data: { done: !action.done } });
}

export async function deleteRiskAction(workspaceId: string, actionId: string) {
  const action = await db.riskAction.findFirst({
    where: { id: actionId, risk: { workspaceId } },
    select: { id: true },
  });
  if (!action) return false;
  await db.riskAction.delete({ where: { id: action.id } });
  return true;
}

export async function riskMatrix(workspaceId: string) {
  const rows = await db.risk.groupBy({
    by: ["likelihood", "impact"],
    where: { workspaceId, status: { notIn: ["CLOSED", "MITIGATED"] } },
    _count: { _all: true },
  });
  return rows.map((row) => ({
    likelihood: row.likelihood,
    impact: row.impact,
    count: row._count._all,
    score: row.likelihood * row.impact,
  }));
}
