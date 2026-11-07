import "server-only";
import { db } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";
import { daysUntil } from "@/lib/utils";
import type { EvidenceKind, Prisma } from "@prisma/client";

export type EvidenceValidity = {
  state: "NONE" | "VALID" | "EXPIRING" | "EXPIRED";
  days: number | null;
  label: string;
};

/** Classify an artifact by its valid-until date. Expiring means inside the 45-day window. */
export function evidenceValidity(expiresAt: Date | string | null | undefined): EvidenceValidity {
  const days = daysUntil(expiresAt ?? null);
  if (days === null) return { state: "NONE", days: null, label: "No expiry" };
  if (days < 0) return { state: "EXPIRED", days, label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 45) return { state: "EXPIRING", days, label: `${days}d left` };
  return { state: "VALID", days, label: "Current" };
}

export type EvidenceLinkInput = {
  policyId?: string | null;
  riskId?: string | null;
  controlId?: string | null;
};

export type CreateEvidenceInput = EvidenceLinkInput & {
  name: string;
  description?: string | null;
  kind: EvidenceKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum: string;
  expiresAt?: Date | null;
};

export async function listEvidence(
  workspaceId: string,
  filters: {
    q?: string;
    kind?: EvidenceKind | "ALL";
    validity?: "ALL" | "EXPIRING" | "EXPIRED" | "NONE";
    policyId?: string;
    riskId?: string;
    controlId?: string;
  } = {},
) {
  const where: Prisma.EvidenceWhereInput = { workspaceId };
  if (filters.kind && filters.kind !== "ALL") where.kind = filters.kind;
  if (filters.validity === "EXPIRED") where.expiresAt = { lt: new Date() };
  if (filters.validity === "NONE") where.expiresAt = null;
  if (filters.validity === "EXPIRING") {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 45);
    where.expiresAt = { gte: new Date(), lte: horizon };
  }
  if (filters.policyId) where.policyId = filters.policyId;
  if (filters.riskId) where.riskId = filters.riskId;
  if (filters.controlId) where.controlId = filters.controlId;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { fileName: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return db.evidence.findMany({
    where,
    include: {
      uploadedBy: { select: { name: true } },
      policy: { select: { id: true, title: true } },
      risk: { select: { id: true, title: true } },
      control: { select: { id: true, ref: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function evidenceSummary(workspaceId: string) {
  const [count, aggregate, linked, expiries] = await Promise.all([
    db.evidence.count({ where: { workspaceId } }),
    db.evidence.aggregate({ where: { workspaceId }, _sum: { sizeBytes: true } }),
    db.evidence.count({
      where: { workspaceId, OR: [{ policyId: { not: null } }, { riskId: { not: null } }, { controlId: { not: null } }] },
    }),
    db.evidence.findMany({ where: { workspaceId }, select: { expiresAt: true } }),
  ]);
  const states = expiries.map((item) => evidenceValidity(item.expiresAt));
  return {
    count,
    totalBytes: aggregate._sum.sizeBytes ?? 0,
    linked,
    expired: states.filter((state) => state.state === "EXPIRED").length,
    expiring: states.filter((state) => state.state === "EXPIRING").length,
    dated: states.filter((state) => state.state !== "NONE").length,
  };
}

export async function expiringEvidence(workspaceId: string, take = 4) {
  return db.evidence.findMany({
    where: { workspaceId, expiresAt: { not: null } },
    select: { id: true, name: true, expiresAt: true, control: { select: { ref: true } } },
    orderBy: { expiresAt: "asc" },
    take,
  });
}

export async function ensureLinksBelongToWorkspace(workspaceId: string, links: EvidenceLinkInput) {
  if (links.policyId) {
    const policy = await db.policy.findFirst({ where: { id: links.policyId, workspaceId }, select: { id: true } });
    if (!policy) throw new Error("The selected policy is not in this workspace.");
  }
  if (links.riskId) {
    const risk = await db.risk.findFirst({ where: { id: links.riskId, workspaceId }, select: { id: true } });
    if (!risk) throw new Error("The selected risk is not in this workspace.");
  }
  if (links.controlId) {
    const control = await db.workspaceControl.findFirst({
      where: { workspaceId, controlId: links.controlId },
      select: { id: true },
    });
    if (!control) throw new Error("The selected control is not enabled in this workspace.");
  }
}

export async function createEvidence(workspaceId: string, actorId: string, input: CreateEvidenceInput) {
  await ensureLinksBelongToWorkspace(workspaceId, input);
  return db.evidence.create({
    data: {
      workspaceId,
      name: input.name,
      description: input.description || null,
      kind: input.kind,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
      checksum: input.checksum,
      uploadedById: actorId,
      policyId: input.policyId || null,
      riskId: input.riskId || null,
      controlId: input.controlId || null,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function getEvidenceForDownload(workspaceId: string, evidenceId: string) {
  return db.evidence.findFirst({
    where: { id: evidenceId, workspaceId },
    select: { id: true, fileName: true, mimeType: true, storageKey: true, name: true },
  });
}

export async function deleteEvidence(workspaceId: string, evidenceId: string) {
  const evidence = await db.evidence.findFirst({
    where: { id: evidenceId, workspaceId },
    select: { id: true, storageKey: true },
  });
  if (!evidence) return false;
  await db.evidence.delete({ where: { id: evidence.id } });
  await deleteStoredFile(evidence.storageKey);
  return true;
}

export async function evidenceOptions(workspaceId: string) {
  const [policies, risks, controls] = await Promise.all([
    db.policy.findMany({ where: { workspaceId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.risk.findMany({ where: { workspaceId }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.workspaceControl.findMany({
      where: { workspaceId },
      select: { control: { select: { id: true, ref: true, title: true } } },
      orderBy: { control: { sortOrder: "asc" } },
    }),
  ]);
  return { policies, risks, controls: controls.map((row) => row.control) };
}
