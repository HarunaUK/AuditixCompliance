import "server-only";
import { db } from "@/lib/db";
import type { policySchema } from "@/lib/validation";
import type { z } from "zod";
import type { PolicyStatus, Prisma } from "@prisma/client";

export type PolicyInput = z.infer<typeof policySchema>;

function dueDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function listPolicies(
  workspaceId: string,
  filters: { status?: PolicyStatus | "ALL"; q?: string; framework?: string } = {},
) {
  const where: Prisma.PolicyWhereInput = { workspaceId };
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.framework) {
    where.controls = { some: { control: { framework: { key: filters.framework } } } };
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { category: { contains: filters.q, mode: "insensitive" } },
      { summary: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.policy.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true } },
      controls: {
        select: { control: { select: { id: true, ref: true, title: true, framework: { select: { key: true, name: true } } } } },
      },
      _count: { select: { controls: true, versions: true, evidence: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function policyCounts(workspaceId: string) {
  const grouped = await db.policy.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
  });
  const counts = { DRAFT: 0, IN_REVIEW: 0, APPROVED: 0, RETIRED: 0, ALL: 0 };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    counts.ALL += row._count._all;
  }
  return counts;
}

export async function getPolicy(workspaceId: string, policyId: string) {
  const policy = await db.policy.findFirst({
    where: { id: policyId, workspaceId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      controls: {
        include: { control: { include: { framework: { select: { name: true, key: true } } } } },
        orderBy: { control: { ref: "asc" } },
      },
      versions: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { version: "desc" },
      },
      evidence: {
        select: { id: true, name: true, fileName: true, mimeType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!policy) return null;
  return policy;
}

export async function createPolicy(
  workspaceId: string,
  actorId: string,
  input: PolicyInput,
  provenance: { aiGenerated?: boolean; aiModel?: string | null } = {},
) {
  return db.$transaction(async (tx) => {
    const policy = await tx.policy.create({
      data: {
        workspaceId,
        title: input.title,
        category: input.category,
        summary: input.summary || null,
        content: input.content,
        status: "DRAFT",
        version: 1,
        ownerId: actorId,
        aiGenerated: provenance.aiGenerated ?? false,
        aiModel: provenance.aiModel ?? null,
        reviewDueAt: dueDate(input.reviewDueAt),
        controls: {
          create: input.controlIds.map((controlId) => ({ controlId })),
        },
      },
    });
    await tx.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        title: policy.title,
        content: policy.content,
        status: policy.status,
        changedById: actorId,
        note: provenance.aiGenerated ? "AI-generated draft" : "Initial draft",
      },
    });
    return policy;
  });
}

export async function updatePolicy(
  workspaceId: string,
  policyId: string,
  actorId: string,
  input: PolicyInput,
) {
  const existing = await db.policy.findFirst({ where: { id: policyId, workspaceId } });
  if (!existing) return null;

  return db.$transaction(async (tx) => {
    const nextVersion = existing.version + 1;
    await tx.policyControl.deleteMany({ where: { policyId } });
    const policy = await tx.policy.update({
      where: { id: policyId },
      data: {
        title: input.title,
        category: input.category,
        summary: input.summary || null,
        content: input.content,
        version: nextVersion,
        reviewDueAt: dueDate(input.reviewDueAt),
        controls: { create: input.controlIds.map((controlId) => ({ controlId })) },
      },
    });
    await tx.policyVersion.create({
      data: {
        policyId,
        version: nextVersion,
        title: policy.title,
        content: policy.content,
        status: policy.status,
        changedById: actorId,
        note: "Content revision",
      },
    });
    return policy;
  });
}

export async function setPolicyStatus(workspaceId: string, policyId: string, status: PolicyStatus) {
  const existing = await db.policy.findFirst({ where: { id: policyId, workspaceId } });
  if (!existing) return null;
  return db.policy.update({
    where: { id: policyId },
    data: {
      status,
      approvedAt: status === "APPROVED" ? new Date() : null,
    },
  });
}

export async function deletePolicy(workspaceId: string, policyId: string) {
  const existing = await db.policy.findFirst({ where: { id: policyId, workspaceId }, select: { id: true } });
  if (!existing) return false;
  await db.policy.delete({ where: { id: policyId } });
  return true;
}

export async function policyOptions(workspaceId: string) {
  return db.policy.findMany({
    where: { workspaceId },
    select: { id: true, title: true, status: true },
    orderBy: { title: "asc" },
  });
}
