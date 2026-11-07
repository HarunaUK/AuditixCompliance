import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
  workspaceName: z.string().trim().min(2, "Name your workspace.").max(80),
});

export const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Name the workspace.").max(80),
});

export const policySchema = z.object({
  title: z.string().trim().min(3, "Add a policy title.").max(140),
  category: z.string().trim().min(2, "Choose a category.").max(60),
  summary: z.string().trim().max(240).optional().or(z.literal("")),
  content: z.string().trim().min(20, "Draft at least a short policy statement.").max(80_000),
  reviewDueAt: z.string().trim().optional().or(z.literal("")),
  controlIds: z.array(z.string()).max(60).default([]),
});

export const policyStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "RETIRED"]);

export const riskSchema = z.object({
  title: z.string().trim().min(4, "Add a risk title.").max(160),
  description: z.string().trim().min(10, "Describe the risk and its impact.").max(8_000),
  category: z.string().trim().min(2).max(60),
  likelihood: z.coerce.number().int().min(1).max(5),
  impact: z.coerce.number().int().min(1).max(5),
  treatment: z.enum(["MITIGATE", "ACCEPT", "TRANSFER", "AVOID"]),
  status: z.enum(["OPEN", "MONITORING", "MITIGATED", "CLOSED"]).default("OPEN"),
  dueDate: z.string().trim().optional().or(z.literal("")),
  ownerId: z.string().trim().optional(),
  controlIds: z.array(z.string()).max(40).default([]),
});

export const riskActionSchema = z.object({
  title: z.string().trim().min(3, "Describe the action.").max(180),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export const evidenceSchema = z.object({
  name: z.string().trim().min(2, "Give the evidence a name.").max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  kind: z.enum(["DOCUMENT", "SCREENSHOT", "LOG", "REPORT", "OTHER"]).default("DOCUMENT"),
  policyId: z.string().trim().optional().or(z.literal("")),
  riskId: z.string().trim().optional().or(z.literal("")),
  controlId: z.string().trim().optional().or(z.literal("")),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});

export const soaDecisionSchema = z
  .object({
    applicable: z.enum(["yes", "no"]),
    justification: z.string().trim().max(600).optional().or(z.literal("")),
  })
  .refine((value) => (value.justification ?? "").length >= 10, {
    message: "Record a justification of at least 10 characters for this control.",
    path: ["justification"],
  });

export const profileSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the organisation name.").max(120),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  headcount: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().int().min(1, "Headcount must be at least 1.").max(1_000_000).optional(),
  ),
  geography: z.string().trim().max(120).optional().or(z.literal("")),
  dataTypes: z.string().trim().max(600).optional().or(z.literal("")),
  cloudProviders: z.string().trim().max(600).optional().or(z.literal("")),
  saasTools: z.string().trim().max(600).optional().or(z.literal("")),
  keySystems: z.string().trim().max(600).optional().or(z.literal("")),
});

export const contextItemSchema = z
  .object({
    type: z.enum(["INTERNAL", "EXTERNAL", "PARTY"]),
    party: z.string().trim().max(140).optional().or(z.literal("")),
    description: z.string().trim().min(4, "Describe the issue or requirement.").max(4_000),
    needs: z.string().trim().max(2_000).optional().or(z.literal("")),
    relevance: z.string().trim().max(2_000).optional().or(z.literal("")),
  })
  .refine((value) => value.type !== "PARTY" || Boolean(value.party?.trim()), {
    message: "Name the interested party.",
    path: ["party"],
  });

export const scopeSchema = z.object({
  statement: z.string().trim().min(50, "The scope statement needs at least 50 characters.").max(20_000),
});

export const methodologySchema = z.object({
  process: z.string().trim().min(20, "Describe how risks are identified and evaluated.").max(8_000),
  likelihood: z.string().trim().min(10, "Define the likelihood scale.").max(4_000),
  impact: z.string().trim().min(10, "Define the impact scale.").max(4_000),
  acceptance: z.string().trim().min(10, "State the risk acceptance criteria.").max(4_000),
  reviewFrequency: z.string().trim().min(2, "Set a review frequency.").max(160),
});

export const ismsRoleSchema = z.object({
  role: z.string().trim().min(2, "Name the role.").max(120),
  holder: z.string().trim().max(120).optional().or(z.literal("")),
  responsibilities: z.string().trim().min(10, "Describe the responsibilities.").max(4_000),
  authority: z.string().trim().max(2_000).optional().or(z.literal("")),
  reportsTo: z.string().trim().max(120).optional().or(z.literal("")),
});

export const objectiveSchema = z.object({
  title: z.string().trim().min(4, "State the objective.").max(180),
  measure: z.string().trim().min(4, "Explain how it is measured.").max(600),
  target: z.string().trim().max(180).optional().or(z.literal("")),
  owner: z.string().trim().max(120).optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
  status: z.enum(["NOT_STARTED", "ON_TRACK", "AT_RISK", "MET", "MISSED"]).default("NOT_STARTED"),
  progressNote: z.string().trim().max(1_000).optional().or(z.literal("")),
});

export const objectiveProgressSchema = z.object({
  status: z.enum(["NOT_STARTED", "ON_TRACK", "AT_RISK", "MET", "MISSED"]),
  progressNote: z.string().trim().max(1_000).optional().or(z.literal("")),
});

export const internalAuditSchema = z.object({
  title: z.string().trim().min(4, "Name the audit.").max(180),
  auditDate: z.string().trim().min(1, "Choose the audit date."),
  scope: z.string().trim().min(5, "Describe what the audit covers.").max(4_000),
  status: z.enum(["PLANNED", "COMPLETED"]).default("PLANNED"),
  findings: z.string().trim().max(6_000).optional().or(z.literal("")),
});

export const managementReviewSchema = z.object({
  reviewDate: z.string().trim().min(1, "Choose the review date."),
  attendees: z.string().trim().min(3, "List the attendees.").max(600),
  decisions: z.string().trim().min(10, "Record the decisions and actions.").max(6_000),
});

export const trainingRecordSchema = z.object({
  course: z.string().trim().min(3, "Name the course.").max(160),
  assignee: z.string().trim().min(2, "Name the person.").max(120),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export const SUPPLIER_CATEGORIES = [
  "Cloud infrastructure",
  "Software",
  "Professional services",
  "Data processor",
  "Hardware",
  "Other",
] as const;

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Name the supplier.").max(140),
  service: z.string().trim().min(3, "Describe what the supplier provides.").max(180),
  category: z.enum(SUPPLIER_CATEGORIES),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  status: z.enum(["ACTIVE", "UNDER_REVIEW", "SUSPENDED", "EXITED"]).default("ACTIVE"),
  ownerId: z.string().trim().optional(),
  dataAccess: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
  dpaSigned: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean()),
  assurance: z.string().trim().max(240).optional().or(z.literal("")),
  lastReviewedAt: z.string().trim().optional().or(z.literal("")),
  nextReviewAt: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(4_000).optional().or(z.literal("")),
});

export const INCIDENT_CATEGORIES = [
  "PHISHING",
  "MALWARE",
  "UNAUTHORISED_ACCESS",
  "DATA_BREACH",
  "AVAILABILITY",
  "LOST_DEVICE",
  "POLICY_BREACH",
  "SUPPLIER",
  "OTHER",
] as const;

export const incidentSchema = z.object({
  title: z.string().trim().min(4, "Give the incident a title.").max(180),
  description: z.string().trim().min(10, "Describe what happened and what was affected.").max(8_000),
  category: z.enum(INCIDENT_CATEGORIES),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  ownerId: z.string().trim().optional(),
  detectedAt: z.string().trim().min(1, "Record when the incident was detected."),
  reportedBy: z.string().trim().max(140).optional().or(z.literal("")),
  supplierId: z.string().trim().optional().or(z.literal("")),
  impact: z.string().trim().max(4_000).optional().or(z.literal("")),
  rootCause: z.string().trim().max(4_000).optional().or(z.literal("")),
});

export const incidentWorkflowSchema = z.object({
  status: z.enum(["INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"]),
  note: z.string().trim().min(3, "Add a short note for the timeline.").max(2_000),
  resolution: z.string().trim().max(4_000).optional().or(z.literal("")),
});

export const incidentSeveritySchema = z.object({
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
});

export const correctiveActionSchema = z.object({
  title: z.string().trim().min(4, "Describe the corrective action.").max(180),
  description: z.string().trim().min(10, "Explain the root cause and the fix.").max(6_000),
  source: z.enum(["INCIDENT", "AUDIT", "MANAGEMENT_REVIEW", "SUPPLIER", "RISK", "OTHER"]),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  ownerId: z.string().trim().optional(),
  dueDate: z.string().trim().optional().or(z.literal("")),
  incidentId: z.string().trim().optional().or(z.literal("")),
  supplierId: z.string().trim().optional().or(z.literal("")),
});

export const correctiveActionAdvanceSchema = z.object({
  action: z.enum(["START", "COMPLETE", "VERIFY"]),
  effectivenessNote: z.string().trim().max(3_000).optional().or(z.literal("")),
});

export function parseDateInput(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export const memberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["ADMIN", "MEMBER", "CONSULTANT"]),
  title: z.string().trim().max(80).optional().or(z.literal("")),
});

export const planSchema = z.enum(["GROWTH", "PRO", "CONSULTANT"]);

export const controlStatusSchema = z.enum(["NOT_STARTED", "IN_PROGRESS", "IMPLEMENTED", "NOT_APPLICABLE"]);

export function parseControlIds(formData: FormData) {
  return formData.getAll("controlIds").filter((value): value is string => typeof value === "string");
}

export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
