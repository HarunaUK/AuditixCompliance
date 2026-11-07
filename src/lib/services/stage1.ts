import "server-only";
import { unstable_cache } from "next/cache";
import { WORKSPACE_DATA_TAG } from "@/lib/cache";
import { db } from "@/lib/db";
import { REQUIRED_POLICY_TOPICS } from "@/lib/services/readiness";

export type Stage1Check = {
  key: string;
  title: string;
  description: string;
  clause: string;
  done: boolean;
  detail: string;
  href: string;
};

export type Stage1Report = {
  met: number;
  total: number;
  percent: number;
  ready: boolean;
  checks: Stage1Check[];
  advisory: { title: string; detail: string; done: boolean };
  generatedAt: Date;
};

const YEAR_MS = 365 * 86_400_000;
const OPEN_RISK_STATUSES = new Set(["OPEN", "MONITORING"]);

async function loadStage1Report(workspaceId: string): Promise<Stage1Report> {
  const since = new Date(Date.now() - YEAR_MS);

  const [workspace, contextItems, roles, objectives, audits, reviews, training, policies, controls, risks, evidence, suppliers, incidents, correctiveActions] =
    await Promise.all([
      db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          name: true,
          createdAt: true,
          scopeStatement: true,
          methodologyProcess: true,
          methodologyLikelihood: true,
          methodologyImpact: true,
          acceptanceCriteria: true,
          methodologyReviewFrequency: true,
        },
      }),
      db.contextItem.findMany({ where: { workspaceId }, select: { type: true } }),
      db.ismsRole.findMany({ where: { workspaceId }, select: { id: true } }),
      db.objective.findMany({ where: { workspaceId }, select: { id: true, status: true } }),
      db.internalAudit.findMany({
        where: { workspaceId, status: "COMPLETED" },
        select: { auditDate: true, completedAt: true },
        orderBy: { auditDate: "desc" },
      }),
      db.managementReview.findMany({
        where: { workspaceId },
        select: { reviewDate: true },
        orderBy: { reviewDate: "desc" },
      }),
      db.trainingRecord.findMany({ where: { workspaceId }, select: { status: true } }),
      db.policy.findMany({ where: { workspaceId }, select: { category: true, status: true } }),
      db.workspaceControl.findMany({
        where: { workspaceId },
        select: { status: true, justification: true },
      }),
      db.risk.findMany({
        where: { workspaceId },
        select: {
          status: true,
          score: true,
          likelihood: true,
          impact: true,
          ownerId: true,
          treatment: true,
          controls: { select: { controlId: true } },
          actions: { select: { id: true, done: true } },
        },
      }),
      db.evidence.findMany({ where: { workspaceId }, select: { storageKey: true } }),
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
        select: { id: true, status: true, dueDate: true, ownerId: true },
      }),
    ]);

  if (!workspace) throw new Error("Workspace not found");

  const approvedCategories = new Set(
    policies.filter((policy) => policy.status === "APPROVED").map((policy) => policy.category),
  );
  const coveredTopics = REQUIRED_POLICY_TOPICS.filter((topic) => approvedCategories.has(topic.category));
  const justified = controls.filter((row) => Boolean(row.justification?.trim())).length;
  const methodologyFields = [
    workspace.methodologyProcess,
    workspace.methodologyLikelihood,
    workspace.methodologyImpact,
    workspace.acceptanceCriteria,
    workspace.methodologyReviewFrequency,
  ];
  const methodologyDone = methodologyFields.every((value) => Boolean(value?.trim()));
  const methodologyMissing = methodologyFields.filter((value) => !value?.trim()).length;
  const assessedRisks = risks.filter(
    (risk) =>
      risk.score > 0 &&
      risk.likelihood > 0 &&
      risk.impact > 0 &&
      Boolean(risk.ownerId) &&
      Boolean(risk.treatment) &&
      (!OPEN_RISK_STATUSES.has(risk.status) || risk.controls.length > 0 || risk.actions.length > 0),
  );
  const issueTypes = new Set(contextItems.filter((item) => item.type !== "PARTY").map((item) => item.type));
  const parties = contextItems.filter((item) => item.type === "PARTY").length;
  const completedAudit = audits.find(
    (audit) => (audit.completedAt ?? audit.auditDate).getTime() >= since.getTime(),
  );
  const latestReview = reviews.find((review) => review.reviewDate.getTime() >= since.getTime());
  const completedTraining = training.filter((record) => record.status === "COMPLETED").length;
  const realEvidence = evidence.filter((item) => !item.storageKey.startsWith("seed/")).length;
  const seededEvidence = evidence.length - realEvidence;
  const metObjectives = objectives.filter((objective) => objective.status === "MET").length;
  const liveSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE" || supplier.status === "UNDER_REVIEW");
  const currentSuppliers = liveSuppliers.filter(
    (supplier) =>
      Boolean(supplier.ownerId) &&
      Boolean(supplier.nextReviewAt && supplier.nextReviewAt >= new Date()) &&
      (!supplier.dataAccess || supplier.dpaSigned),
  );
  const openIncidents = incidents.filter(
    (incident) => incident.status !== "RESOLVED" && incident.status !== "CLOSED",
  );
  const overdueActions = correctiveActions.filter(
    (action) =>
      (action.status === "OPEN" || action.status === "IN_PROGRESS") &&
      Boolean(action.dueDate && action.dueDate < new Date()),
  );
  const unownedIncidents = openIncidents.filter((incident) => !incident.ownerId);
  const unownedActions = correctiveActions.filter((action) => !action.ownerId);

  const checks: Stage1Check[] = [
    {
      key: "scope",
      title: "ISMS scope statement defined",
      description: "A documented boundary for the management system, approved and available to interested parties.",
      clause: "Clause 4.3",
      done: Boolean(workspace.scopeStatement?.trim() && workspace.scopeStatement.trim().length >= 50),
      detail: workspace.scopeStatement?.trim() ? "Scope statement recorded" : "No scope statement yet",
      href: "/scope",
    },
    {
      key: "policies",
      title: "Core policies approved",
      description: "Every required policy topic is written, reviewed and approved rather than left as a draft.",
      clause: "Clause 5.2 / 7.5",
      done: coveredTopics.length === REQUIRED_POLICY_TOPICS.length,
      detail: `${coveredTopics.length}/${REQUIRED_POLICY_TOPICS.length} required policy topics approved`,
      href: "/policies?status=APPROVED",
    },
    {
      key: "soa",
      title: "SoA justified for every control",
      description: "Each control records whether it applies and why, so the Statement of Applicability is defensible.",
      clause: "Clause 6.1.3",
      done: controls.length > 0 && justified === controls.length,
      detail: controls.length ? `${justified}/${controls.length} controls justified` : "No controls loaded",
      href: "/soa",
    },
    {
      key: "methodology",
      title: "Risk assessment methodology documented",
      description: "The process, likelihood and impact scales, acceptance criteria and review cadence are written down.",
      clause: "Clause 6.1.2",
      done: methodologyDone,
      detail: methodologyDone ? "Methodology documented" : `${methodologyMissing} of 5 methodology fields missing`,
      href: "/methodology",
    },
    {
      key: "risks",
      title: "Risks assessed and treated",
      description: "Every risk is scored, owned, has a treatment decision, and is linked to treatment or closed.",
      clause: "Clause 6.1.2 / 8.3",
      done: risks.length > 0 && assessedRisks.length === risks.length,
      detail: risks.length
        ? `${assessedRisks.length}/${risks.length} risks assessed and linked to treatment`
        : "No risks recorded",
      href: "/risks",
    },
    {
      key: "objectives",
      title: "Information security objectives set",
      description: "Measurable objectives with an owner, target and review note.",
      clause: "Clause 6.2",
      done: objectives.length > 0,
      detail: objectives.length
        ? `${objectives.length} objective${objectives.length === 1 ? "" : "s"} · ${metObjectives} met`
        : "None yet",
      href: "/objectives",
    },
    {
      key: "context",
      title: "Context and interested parties captured",
      description: "Internal and external issues, plus the parties whose requirements shape the ISMS.",
      clause: "Clauses 4.1 / 4.2",
      done: issueTypes.size > 0 && parties > 0,
      detail: `${issueTypes.size} issue type${issueTypes.size === 1 ? "" : "s"} · ${parties} interested part${parties === 1 ? "y" : "ies"}`,
      href: "/context",
    },
    {
      key: "roles",
      title: "Roles and responsibilities assigned",
      description: "Named accountability and authority for the ISMS, not an implicit responsibility.",
      clause: "Clause 5.3",
      done: roles.length > 0,
      detail: roles.length ? `${roles.length} roles assigned` : "None yet",
      href: "/roles",
    },
    {
      key: "internal-audit",
      title: "Internal audit completed in the last year",
      description: "A planned, independent audit of the ISMS with findings recorded.",
      clause: "Clause 9.2",
      done: Boolean(completedAudit),
      detail: completedAudit
        ? `Completed ${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(completedAudit.completedAt ?? completedAudit.auditDate)}`
        : "No completed internal audit in the last year",
      href: "/internal-audits",
    },
    {
      key: "management-review",
      title: "Management review held in the last year",
      description: "Top management has reviewed the ISMS, its performance and the decisions needed to improve it.",
      clause: "Clause 9.3",
      done: Boolean(latestReview),
      detail: latestReview
        ? `Held ${new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(latestReview.reviewDate)}`
        : "No management review in the last year",
      href: "/management-reviews",
    },
    {
      key: "training",
      title: "Security awareness training delivered",
      description: "At least one completed training record for the people who operate the ISMS.",
      clause: "Clauses 7.2 / 7.3",
      done: completedTraining > 0,
      detail: completedTraining ? `${completedTraining} completed record${completedTraining === 1 ? "" : "s"}` : "No completed training yet",
      href: "/training",
    },
    {
      key: "evidence",
      title: "Evidence collected (not demo data)",
      description: "At least one real artefact uploaded to the workspace, rather than only seeded demonstration files.",
      clause: "Clause 7.5.3",
      done: realEvidence > 0,
      detail: `${realEvidence} uploaded · ${seededEvidence} seeded artefact${seededEvidence === 1 ? "" : "s"}`,
      href: "/evidence#upload",
    },
    {
      key: "suppliers",
      title: "Supplier due diligence current",
      description: "Every live supplier has an owner and a future review date, and data processors have a signed DPA.",
      clause: "Clause 5.19",
      done: liveSuppliers.length > 0 && currentSuppliers.length === liveSuppliers.length,
      detail: liveSuppliers.length
        ? `${currentSuppliers.length}/${liveSuppliers.length} suppliers current`
        : "No suppliers recorded",
      href: "/suppliers",
    },
    {
      key: "incidents",
      title: "Incident and corrective-action process evidenced",
      description: "Incidents have a named owner, corrective actions are owned and none are past their due date.",
      clause: "Clauses 5.24 / 10.1",
      done: incidents.length > 0 && overdueActions.length === 0 && unownedIncidents.length === 0 && unownedActions.length === 0,
      detail: `${incidents.length} incident${incidents.length === 1 ? "" : "s"} · ${openIncidents.length} open · ${overdueActions.length} overdue action${overdueActions.length === 1 ? "" : "s"}`,
      href: "/incidents",
    },
  ];

  const met = checks.filter((check) => check.done).length;
  const daysActive = Math.floor((Date.now() - workspace.createdAt.getTime()) / 86_400_000);

  return {
    met,
    total: checks.length,
    percent: Math.round((met / checks.length) * 100),
    ready: met === checks.length,
    checks,
    advisory: {
      title: "ISMS operating for around three months",
      detail: `Workspace active ${daysActive} day${daysActive === 1 ? "" : "s"} — auditors usually expect around 90 days of operating evidence.`,
      done: daysActive >= 90,
    },
    generatedAt: new Date(),
  };
}

const cachedStage1Report = unstable_cache(loadStage1Report, ["stage1-report"], {
  revalidate: 300,
  tags: [WORKSPACE_DATA_TAG],
});

export function stage1Report(workspaceId: string) {
  return cachedStage1Report(workspaceId);
}
