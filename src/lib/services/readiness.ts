import "server-only";
import { unstable_cache } from "next/cache";
import { WORKSPACE_DATA_TAG } from "@/lib/cache";
import { db } from "@/lib/db";

export type ReadinessBlocker = {
  phase: string;
  title: string;
  href: string;
};

export type ReadinessPhase = {
  key: string;
  title: string;
  description: string;
  href: string;
  percent: number;
  metric: string;
  note?: string;
  blockers: string[];
};

export type ReadinessReport = {
  percent: number;
  status: "BLOCKED" | "IN_PROGRESS" | "READY";
  label: string;
  headline: string;
  phases: ReadinessPhase[];
  blockers: ReadinessBlocker[];
  completePhases: number;
  updatedAt: Date;
};

/**
 * The policy topics an ISO 27001 auditor expects to see approved before Stage 2.
 * Categories match the seeded policy library so the gate is deterministic.
 */
export const REQUIRED_POLICY_TOPICS = [
  { category: "Governance", label: "information security governance" },
  { category: "Access", label: "access control" },
  { category: "People", label: "people and acceptable use" },
  { category: "Operations", label: "incident response" },
  { category: "Third party", label: "supplier security" },
  { category: "Resilience", label: "business continuity" },
  { category: "Data", label: "data classification" },
] as const;

const OPEN_RISK_STATUSES = new Set(["OPEN", "MONITORING"]);
const OPEN_INCIDENT_STATUSES = new Set(["OPEN", "INVESTIGATING", "CONTAINED"]);
const OPEN_ACTION_STATUSES = new Set(["OPEN", "IN_PROGRESS"]);

async function loadReadinessReport(workspaceId: string): Promise<ReadinessReport> {
  const now = new Date();
  const warnWindow = new Date(now.getTime() + 45 * 86_400_000);

  const [workspace, controls, policies, risks, evidence, suppliers, incidents, correctiveActions] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true, _count: { select: { members: true } } },
    }),
    db.workspaceControl.findMany({
      where: { workspaceId },
      select: { status: true, justification: true, control: { select: { id: true, frameworkId: true } } },
    }),
    db.policy.findMany({
      where: { workspaceId },
      select: { id: true, title: true, category: true, status: true, reviewDueAt: true },
    }),
    db.risk.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        status: true,
        score: true,
        ownerId: true,
        controls: { select: { controlId: true } },
        actions: { select: { done: true, dueDate: true } },
      },
    }),
    db.evidence.findMany({ where: { workspaceId }, select: { id: true, name: true, expiresAt: true, controlId: true } }),
    db.supplier.findMany({
      where: { workspaceId },
      select: {
        id: true,
        criticality: true,
        status: true,
        ownerId: true,
        dataAccess: true,
        dpaSigned: true,
        nextReviewAt: true,
      },
    }),
    db.incident.findMany({
      where: { workspaceId },
      select: { id: true, status: true, severity: true, ownerId: true },
    }),
    db.correctiveAction.findMany({
      where: { workspaceId },
      select: { id: true, status: true, dueDate: true },
    }),
  ]);

  // 1 — Scope and framework coverage
  const frameworks = new Set(controls.map((row) => row.control.frameworkId)).size;
  const scopeChecks = [
    { done: Boolean(workspace?.name && workspace.name.trim().length > 2), issue: "Name the workspace" },
    { done: frameworks > 0, issue: "Enable at least one framework" },
    { done: controls.length > 0, issue: "Load the framework control set" },
    { done: (workspace?._count.members ?? 0) > 0, issue: "Add at least one team member" },
  ];
  const scopePercent = Math.round((scopeChecks.filter((check) => check.done).length / scopeChecks.length) * 100);

  // 2 — Policies approved per required topic
  const approved = policies.filter((policy) => policy.status === "APPROVED");
  const approvedTopics = REQUIRED_POLICY_TOPICS.filter((topic) =>
    approved.some((policy) => policy.category === topic.category),
  );
  const missingTopics = REQUIRED_POLICY_TOPICS.filter(
    (topic) => !approved.some((policy) => policy.category === topic.category),
  );
  const policyPercent = Math.round((approvedTopics.length / REQUIRED_POLICY_TOPICS.length) * 100);

  // 3 — Risk register scored, owned, linked and actioned
  const openRisks = risks.filter((risk) => OPEN_RISK_STATUSES.has(risk.status));
  const assessed = risks.filter((risk) => risk.ownerId && risk.score > 0);
  const highWithoutControl = openRisks.filter((risk) => risk.score >= 12 && risk.controls.length === 0);
  const overdueActions = risks.flatMap((risk) =>
    risk.actions.filter((action) => !action.done && action.dueDate && action.dueDate < now),
  );
  const riskParts = risks.length
    ? [
        25,
        Math.round((assessed.length / risks.length) * 25),
        highWithoutControl.length === 0 ? 25 : 0,
        overdueActions.length === 0 ? 25 : 0,
      ]
    : [0, 0, 0, 0];
  const riskPercent = Math.min(100, riskParts.reduce((sum, part) => sum + part, 0));

  // 4 — Statement of Applicability decided and justified
  const excluded = controls.filter((row) => row.status === "NOT_APPLICABLE");
  const justifiedExcluded = excluded.filter((row) => Boolean(row.justification?.trim()));
  const implemented = controls.filter((row) => row.status === "IMPLEMENTED");
  const applicable = controls.length - excluded.length;
  const unexplained = excluded.length - justifiedExcluded.length;
  const notStarted = controls.filter((row) => row.status === "NOT_STARTED").length;
  const soaPercent = controls.length
    ? Math.round(((implemented.length + justifiedExcluded.length) / controls.length) * 100)
    : 0;

  // 5 — Evidence behind applicable controls
  const evidencedControlIds = new Set(evidence.map((item) => item.controlId).filter((id): id is string => Boolean(id)));
  const evidenced = controls.filter(
    (row) => row.status !== "NOT_APPLICABLE" && evidencedControlIds.has(row.control.id),
  ).length;
  const expiredEvidence = evidence.filter((item) => item.expiresAt && item.expiresAt < now);
  const expiringEvidence = evidence.filter(
    (item) => item.expiresAt && item.expiresAt >= now && item.expiresAt <= warnWindow,
  );
  const evidencePercent = applicable > 0 ? Math.round((evidenced / applicable) * 100) : 0;

  // 6 — Incident and supplier operations
  const liveSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE" || supplier.status === "UNDER_REVIEW");
  const criticalSuppliers = liveSuppliers.filter(
    (supplier) => supplier.criticality === "CRITICAL" || supplier.criticality === "HIGH",
  );
  const currentSupplierReviews = criticalSuppliers.filter(
    (supplier) =>
      Boolean(supplier.ownerId) &&
      Boolean(supplier.nextReviewAt && supplier.nextReviewAt >= now) &&
      (!supplier.dataAccess || supplier.dpaSigned),
  );
  const openIncidents = incidents.filter((incident) => OPEN_INCIDENT_STATUSES.has(incident.status));
  const unownedIncidents = openIncidents.filter((incident) => !incident.ownerId);
  const openCorrectiveActions = correctiveActions.filter((action) => OPEN_ACTION_STATUSES.has(action.status));
  const overdueCorrectiveActions = openCorrectiveActions.filter((action) => action.dueDate && action.dueDate < now);
  const operationsParts = [
    liveSuppliers.length > 0 ? 25 : 0,
    criticalSuppliers.length > 0 && currentSupplierReviews.length === criticalSuppliers.length ? 35 : 0,
    unownedIncidents.length === 0 ? 20 : 0,
    overdueCorrectiveActions.length === 0 ? 20 : 0,
  ];
  const operationsPercent = operationsParts.reduce((sum, part) => sum + part, 0);
  const supplierDpaGaps = liveSuppliers.filter((supplier) => supplier.dataAccess && !supplier.dpaSigned).length;

  // 7 — Reviews and monitoring
  const approvedWithFutureReview = approved.filter((policy) => policy.reviewDueAt && policy.reviewDueAt >= now);
  const overdueReviews = approved.filter((policy) => policy.reviewDueAt && policy.reviewDueAt < now);
  const missingReviewDates = approved.filter((policy) => !policy.reviewDueAt);
  const reviewPercent = approved.length ? Math.round((approvedWithFutureReview.length / approved.length) * 100) : 0;

  const phases: ReadinessPhase[] = [
    {
      key: "scope",
      title: "Scope & framework",
      description: "Workspace profile, frameworks in scope and the team accountable for them.",
      href: "/settings",
      percent: scopePercent,
      metric: `${frameworks} framework${frameworks === 1 ? "" : "s"} · ${controls.length} controls · ${workspace?._count.members ?? 0} members`,
      blockers: scopeChecks.filter((check) => !check.done).map((check) => check.issue),
    },
    {
      key: "policies",
      title: "Policies",
      description: "Every required policy topic written, reviewed and approved.",
      href: "/policies?status=APPROVED",
      percent: policyPercent,
      metric: `${approvedTopics.length}/${REQUIRED_POLICY_TOPICS.length} required topics approved`,
      note: policies.filter((policy) => policy.status === "IN_REVIEW").length
        ? `${policies.filter((policy) => policy.status === "IN_REVIEW").length} policy awaiting review`
        : undefined,
      blockers: missingTopics.map((topic) => `Approve the ${topic.label} policy`),
    },
    {
      key: "risks",
      title: "Risk register",
      description: "Risks scored, owned, linked to controls and treatments on schedule.",
      href: "/risks",
      percent: riskPercent,
      metric: `${assessed.length}/${risks.length} scored and owned · ${overdueActions.length} overdue action${overdueActions.length === 1 ? "" : "s"}`,
      blockers: [
        ...(risks.length === 0 ? ["Record the first risk in the register"] : []),
        ...highWithoutControl.slice(0, 2).map((risk) => `Link a control to “${risk.title}”`),
        ...(overdueActions.length > 0 ? [`${overdueActions.length} treatment action${overdueActions.length === 1 ? " is" : "s are"} overdue`] : []),
      ],
    },
    {
      key: "soa",
      title: "Statement of Applicability",
      description: "Every Annex A control decided, exclusions justified and implementation recorded.",
      href: "/soa",
      percent: soaPercent,
      metric: `${implemented.length}/${applicable} applicable implemented · ${excluded.length} excluded`,
      note: `${notStarted} control${notStarted === 1 ? "" : "s"} not started`,
      blockers: [
        ...(unexplained > 0 ? [`${unexplained} exclusion${unexplained === 1 ? "" : "s"} need a justification`] : []),
        ...(notStarted > 0 ? [`${notStarted} applicable control${notStarted === 1 ? " is" : "s are"} not started`] : []),
      ],
    },
    {
      key: "evidence",
      title: "Evidence",
      description: "Every applicable control backed by current, in-date evidence.",
      href: "/evidence",
      percent: evidencePercent,
      metric: `${evidenced}/${applicable} applicable controls evidenced`,
      note: expiringEvidence.length ? `${expiringEvidence.length} artifact${expiringEvidence.length === 1 ? "" : "s"} expiring in 45 days` : undefined,
      blockers: [
        ...(expiredEvidence.length > 0 ? [`${expiredEvidence.length} evidence item${expiredEvidence.length === 1 ? " has" : "s have"} expired`] : []),
        ...(applicable - evidenced > 0
          ? [`${applicable - evidenced} applicable control${applicable - evidenced === 1 ? " has" : "s have"} no evidence`]
          : []),
      ],
    },
    {
      key: "operations",
      title: "Incidents & suppliers",
      description: "Supplier due diligence current, open incidents owned and corrective actions on schedule.",
      href: "/incidents",
      percent: operationsPercent,
      metric: `${liveSuppliers.length} supplier${liveSuppliers.length === 1 ? "" : "s"} · ${openIncidents.length} open incident${openIncidents.length === 1 ? "" : "s"} · ${overdueCorrectiveActions.length} overdue action${overdueCorrectiveActions.length === 1 ? "" : "s"}`,
      note:
        supplierDpaGaps > 0
          ? `${supplierDpaGaps} supplier${supplierDpaGaps === 1 ? " has" : "s have"} data access without a DPA`
          : undefined,
      blockers: [
        ...(liveSuppliers.length === 0 ? ["Record the suppliers that support the ISMS"] : []),
        ...(criticalSuppliers.length > 0 && currentSupplierReviews.length < criticalSuppliers.length
          ? [`${criticalSuppliers.length - currentSupplierReviews.length} critical or high supplier review${criticalSuppliers.length - currentSupplierReviews.length === 1 ? " is" : "s are"} incomplete`]
          : []),
        ...(unownedIncidents.length > 0
          ? [`${unownedIncidents.length} open incident${unownedIncidents.length === 1 ? " has" : "s have"} no owner`]
          : []),
        ...(overdueCorrectiveActions.length > 0
          ? [`${overdueCorrectiveActions.length} corrective action${overdueCorrectiveActions.length === 1 ? " is" : "s are"} overdue`]
          : []),
      ],
    },
    {
      key: "review",
      title: "Review & monitoring",
      description: "Approved policies carry a future review date; nothing is past its cycle.",
      href: "/policies?status=APPROVED",
      percent: reviewPercent,
      metric: `${approvedWithFutureReview.length}/${approved.length} approved policies in date`,
      blockers: [
        ...(overdueReviews.length > 0 ? [`${overdueReviews.length} policy review${overdueReviews.length === 1 ? " is" : "s are"} overdue`] : []),
        ...(missingReviewDates.length > 0
          ? [`${missingReviewDates.length} approved polic${missingReviewDates.length === 1 ? "y has" : "ies have"} no review date`]
          : []),
      ],
    },
  ];

  const weights: Record<string, number> = {
    scope: 0.05,
    policies: 0.15,
    risks: 0.2,
    soa: 0.2,
    evidence: 0.2,
    operations: 0.15,
    review: 0.05,
  };
  const percent = Math.round(phases.reduce((sum, phase) => sum + phase.percent * (weights[phase.key] ?? 0), 0));

  const blockers: ReadinessBlocker[] = phases.flatMap((phase) =>
    phase.blockers.map((title) => ({ phase: phase.title, title, href: phase.href })),
  );

  const status: ReadinessReport["status"] = percent >= 85 && blockers.length === 0 ? "READY" : percent >= 50 ? "IN_PROGRESS" : "BLOCKED";
  const label = status === "READY" ? "Audit ready" : status === "IN_PROGRESS" ? "Nearly ready" : "Not cert ready";
  const headline =
    status === "READY"
      ? "The gate is clear. Keep the evidence trail and review cycle warm."
      : status === "IN_PROGRESS"
        ? "Close the blockers below and the audit gate opens."
        : "Start with the policies and controls an auditor will ask about first.";

  return {
    percent,
    status,
    label,
    headline,
    phases,
    blockers,
    completePhases: phases.filter((phase) => phase.percent >= 100).length,
    updatedAt: now,
  };
}

const cachedReadinessReport = unstable_cache(loadReadinessReport, ["readiness-report"], {
  revalidate: 300,
  tags: [WORKSPACE_DATA_TAG],
});

export function readinessReport(workspaceId: string) {
  return cachedReadinessReport(workspaceId);
}
