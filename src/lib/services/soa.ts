import "server-only";
import { db } from "@/lib/db";
import type { ControlStatus, Prisma } from "@prisma/client";

export type SoaFilter = {
  framework?: string;
  decision?: "ALL" | "APPLICABLE" | "EXCLUDED" | "GAPS";
  q?: string;
};

export async function listSoa(workspaceId: string, filters: SoaFilter = {}) {
  const where: Prisma.WorkspaceControlWhereInput = { workspaceId };
  if (filters.decision === "APPLICABLE") where.status = { not: "NOT_APPLICABLE" };
  if (filters.decision === "EXCLUDED") where.status = "NOT_APPLICABLE";
  if (filters.decision === "GAPS") where.status = { in: ["NOT_STARTED", "IN_PROGRESS"] };
  if (filters.framework || filters.q) {
    where.control = {};
    if (filters.framework) where.control.framework = { key: filters.framework };
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
          policies: { where: { policy: { workspaceId } }, select: { policyId: true } },
          risks: { where: { risk: { workspaceId } }, select: { riskId: true } },
          evidence: {
            where: { workspaceId },
            select: { id: true, name: true, expiresAt: true },
          },
        },
      },
    },
    orderBy: [{ control: { sortOrder: "asc" } }],
  });
}

export type SoaRow = Awaited<ReturnType<typeof listSoa>>[number];

export async function soaSummary(workspaceId: string) {
  const rows = await db.workspaceControl.findMany({
    where: { workspaceId },
    select: {
      status: true,
      justification: true,
      control: {
        select: {
          framework: { select: { key: true, name: true } },
          evidence: { where: { workspaceId }, select: { id: true } },
        },
      },
    },
  });

  const total = rows.length;
  const excluded = rows.filter((row) => row.status === "NOT_APPLICABLE").length;
  const applicable = total - excluded;
  const implemented = rows.filter((row) => row.status === "IMPLEMENTED").length;
  const inProgress = rows.filter((row) => row.status === "IN_PROGRESS").length;
  const notStarted = rows.filter((row) => row.status === "NOT_STARTED").length;
  const justified = rows.filter((row) => Boolean(row.justification?.trim())).length;
  const unjustified = total - justified;
  const unexplained = rows.filter((row) => row.status === "NOT_APPLICABLE" && !row.justification?.trim()).length;
  const evidenced = rows.filter((row) => row.status !== "NOT_APPLICABLE" && row.control.evidence.length > 0).length;
  const percent = applicable > 0 ? Math.round((implemented / applicable) * 100) : 0;

  const frameworks = Array.from(
    new Map(rows.map((row) => [row.control.framework.key, row.control.framework.name])).entries(),
  ).map(([key, name]) => ({ key, name }));

  return {
    total,
    applicable,
    excluded,
    implemented,
    inProgress,
    notStarted,
    justified,
    unjustified,
    unexplained,
    evidenced,
    percent,
    frameworks,
  };
}

export async function updateSoaDecision(
  workspaceId: string,
  controlId: string,
  input: { applicable: boolean; justification: string | null },
) {
  const existing = await db.workspaceControl.findFirst({
    where: { workspaceId, controlId },
    include: { control: { select: { ref: true, title: true } } },
  });
  if (!existing) return null;

  const status: ControlStatus = input.applicable
    ? existing.status === "NOT_APPLICABLE"
      ? "NOT_STARTED"
      : existing.status
    : "NOT_APPLICABLE";

  const updated = await db.workspaceControl.update({
    where: { id: existing.id },
    data: {
      status,
      justification: input.justification,
      reviewedAt: new Date(),
    },
  });

  return { ...updated, control: existing.control };
}

export function soaCsv(rows: SoaRow[]) {
  const header = [
    "Reference",
    "Framework",
    "Control",
    "Applicable",
    "Justification",
    "Implementation",
    "Linked policies",
    "Linked risks",
    "Evidence items",
  ];
  const escape = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  };
  const lines = rows.map((row) =>
    [
      row.control.ref,
      row.control.framework.name,
      row.control.title,
      row.status === "NOT_APPLICABLE" ? "No" : "Yes",
      row.justification ?? "",
      row.status.replaceAll("_", " ").toLowerCase(),
      row.control.policies.length,
      row.control.risks.length,
      row.control.evidence.length,
    ]
      .map(escape)
      .join(","),
  );
  return [header.map(escape).join(","), ...lines].join("\r\n");
}
