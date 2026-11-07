import "server-only";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { titleCase } from "@/lib/utils";

/**
 * Register exports.
 *
 * Each register is defined once — columns, fetch, row mapping — so the CSV a
 * user downloads, the CSV they can re-import and the copy inside the auditor
 * package all describe the same fields.
 */
export type RegisterKey = "policies" | "risks" | "suppliers" | "incidents" | "actions" | "training" | "evidence";

export const REGISTER_KEYS: RegisterKey[] = [
  "policies",
  "risks",
  "suppliers",
  "incidents",
  "actions",
  "training",
  "evidence",
];

export const REGISTER_LABELS: Record<RegisterKey, string> = {
  policies: "Policy library",
  risks: "Risk register",
  suppliers: "Supplier register",
  incidents: "Incident register",
  actions: "Corrective actions",
  training: "Training records",
  evidence: "Evidence index",
};

export const REGISTER_COLUMNS: Record<RegisterKey, string[]> = {
  policies: [
    "Title",
    "Category",
    "Status",
    "Version",
    "Owner",
    "Review due",
    "Approved at",
    "AI drafted",
    "Controls",
    "Summary",
    "Content",
  ],
  risks: [
    "Title",
    "Category",
    "Likelihood",
    "Impact",
    "Score",
    "Treatment",
    "Status",
    "Owner",
    "Due",
    "Controls",
    "Open actions",
    "Description",
  ],
  suppliers: [
    "Name",
    "Service",
    "Category",
    "Criticality",
    "Status",
    "Owner",
    "Data access",
    "DPA signed",
    "Assurance",
    "Last reviewed",
    "Next review",
    "Notes",
  ],
  incidents: [
    "Reference",
    "Title",
    "Category",
    "Severity",
    "Status",
    "Owner",
    "Detected",
    "Contained",
    "Resolved",
    "Supplier",
    "Impact",
    "Root cause",
    "Resolution",
  ],
  actions: [
    "Reference",
    "Title",
    "Source",
    "Status",
    "Priority",
    "Owner",
    "Due",
    "Completed",
    "Verified",
    "Incident",
    "Supplier",
    "Description",
    "Effectiveness note",
  ],
  training: ["Course", "Assignee", "Status", "Due", "Completed"],
  evidence: [
    "Name",
    "Kind",
    "Control",
    "Policy",
    "Risk",
    "Uploaded by",
    "Uploaded",
    "Valid until",
    "Size (bytes)",
    "SHA-256",
    "Description",
  ],
};

const day = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : "");
const flat = (value: string | null | undefined) => (value ?? "").replace(/\r\n/g, "\n");

async function policies(workspaceId: string) {
  const rows = await db.policy.findMany({
    where: { workspaceId },
    include: {
      owner: { select: { name: true } },
      controls: { select: { control: { select: { ref: true } } } },
    },
    orderBy: { title: "asc" },
  });
  return rows.map((policy) => [
    policy.title,
    policy.category,
    titleCase(policy.status),
    policy.version,
    policy.owner.name,
    day(policy.reviewDueAt),
    day(policy.approvedAt),
    policy.aiGenerated ? "yes" : "no",
    policy.controls.map((link) => link.control.ref).join(" "),
    flat(policy.summary),
    flat(policy.content),
  ]);
}

async function risks(workspaceId: string) {
  const rows = await db.risk.findMany({
    where: { workspaceId },
    include: {
      owner: { select: { name: true } },
      _count: { select: { controls: true, actions: true } },
      actions: { select: { done: true } },
    },
    orderBy: [{ score: "desc" }, { title: "asc" }],
  });
  return rows.map((risk) => [
    risk.title,
    risk.category,
    risk.likelihood,
    risk.impact,
    risk.score,
    titleCase(risk.treatment),
    titleCase(risk.status),
    risk.owner.name,
    day(risk.dueDate),
    risk._count.controls,
    risk.actions.filter((action) => !action.done).length,
    flat(risk.description),
  ]);
}

async function suppliers(workspaceId: string) {
  const rows = await db.supplier.findMany({
    where: { workspaceId },
    include: { owner: { select: { name: true } } },
    orderBy: [{ criticality: "asc" }, { name: "asc" }],
  });
  return rows.map((supplier) => [
    supplier.name,
    supplier.service,
    supplier.category,
    titleCase(supplier.criticality),
    titleCase(supplier.status),
    supplier.owner.name,
    supplier.dataAccess ? "yes" : "no",
    supplier.dpaSigned ? "yes" : "no",
    flat(supplier.assurance),
    day(supplier.lastReviewedAt),
    day(supplier.nextReviewAt),
    flat(supplier.notes),
  ]);
}

async function incidents(workspaceId: string) {
  const rows = await db.incident.findMany({
    where: { workspaceId },
    include: { owner: { select: { name: true } }, supplier: { select: { name: true } } },
    orderBy: [{ detectedAt: "desc" }],
  });
  return rows.map((incident) => [
    incident.reference,
    incident.title,
    titleCase(incident.category),
    titleCase(incident.severity),
    titleCase(incident.status),
    incident.owner.name,
    day(incident.detectedAt),
    day(incident.containedAt),
    day(incident.resolvedAt),
    incident.supplier?.name ?? "",
    flat(incident.impact),
    flat(incident.rootCause),
    flat(incident.resolution),
  ]);
}

async function actions(workspaceId: string) {
  const rows = await db.correctiveAction.findMany({
    where: { workspaceId },
    include: {
      owner: { select: { name: true } },
      incident: { select: { reference: true } },
      supplier: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  return rows.map((action) => [
    action.reference,
    action.title,
    titleCase(action.source),
    titleCase(action.status),
    titleCase(action.priority),
    action.owner.name,
    day(action.dueDate),
    day(action.completedAt),
    day(action.verifiedAt),
    action.incident?.reference ?? "",
    action.supplier?.name ?? "",
    flat(action.description),
    flat(action.effectivenessNote),
  ]);
}

async function training(workspaceId: string) {
  const rows = await db.trainingRecord.findMany({
    where: { workspaceId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  return rows.map((record) => [
    record.course,
    record.assignee,
    titleCase(record.status),
    day(record.dueDate),
    day(record.completedAt),
  ]);
}

async function evidence(workspaceId: string) {
  const rows = await db.evidence.findMany({
    where: { workspaceId },
    include: {
      uploadedBy: { select: { name: true } },
      control: { select: { ref: true } },
      policy: { select: { title: true } },
      risk: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((item) => [
    item.name,
    titleCase(item.kind),
    item.control?.ref ?? "",
    item.policy?.title ?? "",
    item.risk?.title ?? "",
    item.uploadedBy.name,
    day(item.createdAt),
    day(item.expiresAt),
    item.sizeBytes,
    item.checksum,
    flat(item.description),
  ]);
}

const BUILDERS: Record<RegisterKey, (workspaceId: string) => Promise<unknown[][]>> = {
  policies,
  risks,
  suppliers,
  incidents,
  actions,
  training,
  evidence,
};

export function isRegisterKey(value: string): value is RegisterKey {
  return REGISTER_KEYS.includes(value as RegisterKey);
}

export async function registerCsv(workspaceId: string, key: RegisterKey) {
  const rows = await BUILDERS[key](workspaceId);
  return toCsv(REGISTER_COLUMNS[key], rows);
}

export function registerTemplate(key: RegisterKey) {
  return `${REGISTER_COLUMNS[key].join(",")}\r\n`;
}

function stripLeadingHeading(content: string) {
  const trimmed = content.trim();
  return trimmed.replace(/^#\s+[^\n]*\n+/, "");
}

export async function policyMarkdown(workspaceId: string, policyId: string) {
  const policy = await db.policy.findFirst({
    where: { id: policyId, workspaceId },
    include: { owner: { select: { name: true } }, controls: { select: { control: { select: { ref: true } } } } },
  });
  if (!policy) return null;

  const front = [
    `# ${policy.title}`,
    "",
    `- Category: ${policy.category}`,
    `- Status: ${titleCase(policy.status)}`,
    `- Version: ${policy.version}`,
    `- Owner: ${policy.owner.name}`,
    policy.reviewDueAt ? `- Next review: ${day(policy.reviewDueAt)}` : null,
    policy.approvedAt ? `- Approved: ${day(policy.approvedAt)}` : null,
    policy.controls.length ? `- Controls: ${policy.controls.map((link) => link.control.ref).join(", ")}` : null,
    policy.aiGenerated ? `- Drafted with: ${policy.aiModel ?? "AI assistant"}` : null,
    "",
    "---",
    "",
  ].filter((line): line is string => line !== null);

  return front.join("\n") + stripLeadingHeading(policy.content) + "\n";
}

export { stripLeadingHeading };

export function markdownFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "policy"}.md`;
}
