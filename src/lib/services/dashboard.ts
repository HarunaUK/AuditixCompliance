import "server-only";
import { unstable_cache } from "next/cache";
import { WORKSPACE_DATA_TAG } from "@/lib/cache";
import { db } from "@/lib/db";
import { formatDate, scoreBand } from "@/lib/utils";
import type { ControlStatus } from "@prisma/client";

const CLOSED_RISK_STATUSES = new Set(["CLOSED", "MITIGATED"]);

async function loadDashboardData(workspaceId: string) {
  const now = new Date();
  const inThirtyDays = new Date(now);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  const evidenceHorizon = new Date(now);
  evidenceHorizon.setDate(evidenceHorizon.getDate() + 45);

  // One batched read per entity. The previous version issued separate counts,
  // aggregates and lists for policies, risks, controls and evidence, which
  // meant the dashboard spent most of its time waiting on round trips.
  const [policies, riskRows, controlRows, evidenceRows, members, auditEvents] = await Promise.all([
    db.policy.findMany({
      where: { workspaceId },
      select: { id: true, title: true, category: true, status: true, reviewDueAt: true, updatedAt: true },
    }),
    db.risk.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        score: true,
        likelihood: true,
        impact: true,
        treatment: true,
        dueDate: true,
        updatedAt: true,
        actions: { select: { id: true, title: true, done: true, dueDate: true, createdAt: true } },
      },
    }),
    db.workspaceControl.findMany({
      where: { workspaceId },
      select: {
        status: true,
        control: { select: { id: true, ref: true, framework: { select: { key: true, name: true } } } },
      },
    }),
    db.evidence.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        controlId: true,
        policyId: true,
        riskId: true,
        expiresAt: true,
        createdAt: true,
        sizeBytes: true,
      },
    }),
    db.workspaceMember.count({ where: { workspaceId } }),
    db.auditEvent.findMany({
      where: { workspaceId },
      select: { id: true, entityType: true, entityId: true, summary: true, detail: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const policyCounts = { DRAFT: 0, IN_REVIEW: 0, APPROVED: 0, RETIRED: 0, ALL: policies.length };
  for (const policy of policies) policyCounts[policy.status] += 1;

  const risks = {
    total: riskRows.length,
    open: riskRows.filter((risk) => risk.status === "OPEN").length,
    critical: riskRows.filter((risk) => risk.score >= 20).length,
    high: riskRows.filter((risk) => risk.score >= 12 && risk.score < 20).length,
    accepted: riskRows.filter((risk) => risk.treatment === "ACCEPT").length,
    overdue: riskRows.filter(
      (risk) => risk.dueDate && risk.dueDate < now && !CLOSED_RISK_STATUSES.has(risk.status),
    ).length,
  };

  const matrix = new Map<string, { likelihood: number; impact: number; count: number; score: number }>();
  for (const risk of riskRows) {
    if (CLOSED_RISK_STATUSES.has(risk.status)) continue;
    const key = `${risk.likelihood}:${risk.impact}`;
    const cell = matrix.get(key) ?? {
      likelihood: risk.likelihood,
      impact: risk.impact,
      count: 0,
      score: risk.likelihood * risk.impact,
    };
    cell.count += 1;
    matrix.set(key, cell);
  }

  const recentRisks = [...riskRows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 4);

  const openActionRows = riskRows
    .filter((risk) => !CLOSED_RISK_STATUSES.has(risk.status))
    .flatMap((risk) =>
      risk.actions
        .filter((action) => !action.done)
        .map((action) => ({
          id: action.id,
          title: action.title,
          dueDate: action.dueDate,
          createdAt: action.createdAt,
          risk: { id: risk.id, title: risk.title },
        })),
    )
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.createdAt.getTime() - b.createdAt.getTime();
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

  const controlCounts: Record<ControlStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    IMPLEMENTED: 0,
    NOT_APPLICABLE: 0,
  };
  const frameworkMap = new Map<string, { key: string; name: string; total: number; applicable: number; implemented: number }>();
  const controlRefs = new Map<string, string>();
  for (const row of controlRows) {
    controlCounts[row.status] += 1;
    controlRefs.set(row.control.id, row.control.ref);

    const framework = row.control.framework;
    const entry = frameworkMap.get(framework.key) ?? {
      key: framework.key,
      name: framework.name,
      total: 0,
      applicable: 0,
      implemented: 0,
    };
    entry.total += 1;
    if (row.status !== "NOT_APPLICABLE") entry.applicable += 1;
    if (row.status === "IMPLEMENTED") entry.implemented += 1;
    frameworkMap.set(framework.key, entry);
  }
  const controlTotal = controlRows.length;
  const applicableControls = controlTotal - controlCounts.NOT_APPLICABLE;
  const controls = {
    ...controlCounts,
    total: controlTotal,
    applicable: applicableControls,
    percent: applicableControls ? Math.round((controlCounts.IMPLEMENTED / applicableControls) * 100) : 0,
  };
  const frameworks = Array.from(frameworkMap.values())
    .map((entry) => ({
      ...entry,
      percent: entry.applicable ? Math.round((entry.implemented / entry.applicable) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent);

  const evidence = {
    count: evidenceRows.length,
    totalBytes: evidenceRows.reduce((sum, item) => sum + item.sizeBytes, 0),
    linked: evidenceRows.filter((item) => item.policyId || item.riskId || item.controlId).length,
    expired: evidenceRows.filter((item) => item.expiresAt && item.expiresAt < now).length,
    expiring: evidenceRows.filter(
      (item) => item.expiresAt && item.expiresAt >= now && item.expiresAt <= evidenceHorizon,
    ).length,
    dated: evidenceRows.filter((item) => item.expiresAt).length,
  };

  const policiesDue = policies
    .filter((policy) => policy.status === "APPROVED" && policy.reviewDueAt && policy.reviewDueAt <= inThirtyDays)
    .sort((a, b) => (a.reviewDueAt?.getTime() ?? 0) - (b.reviewDueAt?.getTime() ?? 0))
    .slice(0, 4);

  const expiring = [...evidenceRows]
    .filter((item) => item.expiresAt)
    .sort((a, b) => (a.expiresAt?.getTime() ?? 0) - (b.expiresAt?.getTime() ?? 0))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      name: item.name,
      expiresAt: item.expiresAt,
      control: item.controlId ? { ref: controlRefs.get(item.controlId) ?? "—" } : null,
    }));

  const activityHref = (entityType: string, entityId: string | null) => {
    switch (entityType) {
      case "Policy":
        return entityId ? `/policies/${entityId}` : "/policies";
      case "Risk":
        return entityId ? `/risks/${entityId}` : "/risks";
      case "Evidence":
        return "/evidence";
      case "Control":
        return "/soa";
      case "Profile":
        return "/onboarding";
      case "Context":
        return "/context";
      case "Scope":
        return "/scope";
      case "Methodology":
        return "/methodology";
      case "Objective":
        return "/objectives";
      case "IsmsRole":
        return "/roles";
      case "InternalAudit":
        return "/internal-audits";
      case "ManagementReview":
        return "/management-reviews";
      case "Training":
        return "/training";
      case "Supplier":
        return "/suppliers";
      case "Incident":
        return entityId ? `/incidents/${entityId}` : "/incidents";
      case "CorrectiveAction":
        return "/corrective-actions";
      default:
        return "/settings";
    }
  };

  const fallbackActivity = [
    ...[...policies]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 3)
      .map((policy) => ({
        id: `policy-${policy.id}`,
        kind: "Policy",
        title: policy.title,
        detail: policy.status.replaceAll("_", " ").toLowerCase(),
        href: `/policies/${policy.id}`,
        at: policy.updatedAt,
      })),
    ...recentRisks.map((risk) => ({
      id: `risk-${risk.id}`,
      kind: "Risk",
      title: risk.title,
      detail: `${scoreBand(risk.score).label} · score ${risk.score}`,
      href: `/risks/${risk.id}`,
      at: risk.updatedAt,
    })),
    ...[...evidenceRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 3)
      .map((item) => ({
        id: `evidence-${item.id}`,
        kind: "Evidence",
        title: item.name,
        detail: "Evidence uploaded",
        href: "/evidence",
        at: item.createdAt,
      })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const activity = auditEvents.length
    ? auditEvents.map((event) => ({
        id: event.id,
        kind: event.entityType,
        title: event.summary,
        detail: event.detail,
        href: activityHref(event.entityType, event.entityId),
        at: event.createdAt,
      }))
    : fallbackActivity;

  return {
    policies: policyCounts,
    risks,
    evidence,
    controls,
    members,
    openActions: openActionRows.length,
    frameworks,
    matrix: Array.from(matrix.values()),
    recentRisks,
    policiesDue,
    actions: openActionRows.slice(0, 5),
    activity,
    expiring,
    reviewWindow: formatDate(inThirtyDays),
  };
}

/**
 * The dashboard is a read model. Cache it between requests so sidebar clicks do
 * not re-run the same batched queries; any write clears the tag via recordActivity.
 */
const cachedDashboardData = unstable_cache(loadDashboardData, ["dashboard-data"], {
  revalidate: 300,
  tags: [WORKSPACE_DATA_TAG],
});

export function dashboardData(workspaceId: string) {
  return cachedDashboardData(workspaceId);
}
