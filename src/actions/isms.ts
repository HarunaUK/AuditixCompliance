"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";
import { getProfile, scopeDraft } from "@/lib/services/isms";
import {
  contextItemSchema,
  internalAuditSchema,
  ismsRoleSchema,
  managementReviewSchema,
  methodologySchema,
  objectiveProgressSchema,
  objectiveSchema,
  parseDateInput,
  profileSchema,
  scopeSchema,
  trainingRecordSchema,
} from "@/lib/validation";

function invalid(path: string, message: string | undefined): never {
  redirect(`${path}?error=${encodeURIComponent(message ?? "Check the form and try again.")}`);
}

function revalidateIsms(path: string) {
  revalidatePath(path);
  revalidatePath("/stage-1");
  revalidatePath("/dashboard");
  revalidatePath("/activity");
}

export async function saveProfileAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/onboarding", "Your role is read-only.");

  const parsed = profileSchema.safeParse({
    companyName: formData.get("companyName"),
    industry: formData.get("industry"),
    headcount: formData.get("headcount"),
    geography: formData.get("geography"),
    dataTypes: formData.get("dataTypes"),
    cloudProviders: formData.get("cloudProviders"),
    saasTools: formData.get("saasTools"),
    keySystems: formData.get("keySystems"),
  });
  if (!parsed.success) invalid("/onboarding", parsed.error.issues[0]?.message);

  const data = {
    companyName: parsed.data.companyName,
    industry: parsed.data.industry || null,
    headcount: parsed.data.headcount ?? null,
    geography: parsed.data.geography || null,
    dataTypes: parsed.data.dataTypes || null,
    cloudProviders: parsed.data.cloudProviders || null,
    saasTools: parsed.data.saasTools || null,
    keySystems: parsed.data.keySystems || null,
  };
  await db.workspaceProfile.upsert({
    where: { workspaceId: context.workspace.id },
    update: data,
    create: { workspaceId: context.workspace.id, ...data },
  });

  const intent = String(formData.get("intent") ?? "save");
  let generated = false;
  if (intent === "generate") {
    const workspace = await db.workspace.findUnique({
      where: { id: context.workspace.id },
      select: {
        name: true,
        scopeStatement: true,
        controls: { select: { control: { select: { framework: { select: { name: true } } } } } },
      },
    });
    if (workspace && !workspace.scopeStatement?.trim()) {
      const frameworks = Array.from(
        new Map(workspace.controls.map((row) => [row.control.framework.name, row.control.framework])).values(),
      );
      await db.workspace.update({
        where: { id: context.workspace.id },
        data: {
          scopeStatement: scopeDraft(workspace.name, data, frameworks),
          scopeUpdatedAt: new Date(),
        },
      });
      await recordActivity({
        workspaceId: context.workspace.id,
        actor: context.user,
        action: "scope.generated",
        entityType: "Scope",
        entityId: context.workspace.id,
        summary: "Generated the ISMS scope from the onboarding intake",
        detail: "Draft for review under Clause 4.3",
      });
      generated = true;
    }
  }

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "profile.updated",
    entityType: "Profile",
    entityId: context.workspace.id,
    summary: "Updated the organisation profile",
    detail: `${data.companyName}${data.industry ? ` · ${data.industry}` : ""}`,
  });

  revalidateIsms("/onboarding");
  redirect(generated ? "/scope?generated=1" : "/onboarding?saved=1");
}

export async function saveScopeAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/scope", "Your role is read-only.");
  const parsed = scopeSchema.safeParse({ statement: formData.get("statement") });
  if (!parsed.success) invalid("/scope", parsed.error.issues[0]?.message);

  await db.workspace.update({
    where: { id: context.workspace.id },
    data: { scopeStatement: parsed.data.statement, scopeUpdatedAt: new Date() },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scope.updated",
    entityType: "Scope",
    entityId: context.workspace.id,
    summary: "Updated the ISMS scope statement",
    detail: "Clause 4.3 boundary and applicability",
  });
  revalidateIsms("/scope");
  redirect("/scope?saved=1");
}

export async function generateScopeAction() {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/scope", "Your role is read-only.");

  const [workspace, profile] = await Promise.all([
    db.workspace.findUnique({
      where: { id: context.workspace.id },
      select: {
        name: true,
        controls: { select: { control: { select: { framework: { select: { name: true } } } } } },
      },
    }),
    getProfile(context.workspace.id),
  ]);
  if (!workspace) invalid("/scope", "Workspace not found.");

  const frameworks = Array.from(
    new Map(workspace.controls.map((row) => [row.control.framework.name, row.control.framework])).values(),
  );
  const statement = scopeDraft(workspace.name, profile, frameworks);
  await db.workspace.update({
    where: { id: context.workspace.id },
    data: { scopeStatement: statement, scopeUpdatedAt: new Date() },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scope.generated",
    entityType: "Scope",
    entityId: context.workspace.id,
    summary: "Generated a draft ISMS scope statement",
    detail: profile ? "Built from the onboarding intake" : "Built from the workspace name",
  });
  revalidateIsms("/scope");
  redirect("/scope?generated=1");
}

export async function saveMethodologyAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/methodology", "Your role is read-only.");
  const parsed = methodologySchema.safeParse({
    process: formData.get("process"),
    likelihood: formData.get("likelihood"),
    impact: formData.get("impact"),
    acceptance: formData.get("acceptance"),
    reviewFrequency: formData.get("reviewFrequency"),
  });
  if (!parsed.success) invalid("/methodology", parsed.error.issues[0]?.message);

  await db.workspace.update({
    where: { id: context.workspace.id },
    data: {
      methodologyProcess: parsed.data.process,
      methodologyLikelihood: parsed.data.likelihood,
      methodologyImpact: parsed.data.impact,
      acceptanceCriteria: parsed.data.acceptance,
      methodologyReviewFrequency: parsed.data.reviewFrequency,
      methodologyUpdatedAt: new Date(),
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "methodology.updated",
    entityType: "Methodology",
    entityId: context.workspace.id,
    summary: "Updated the risk assessment methodology",
    detail: `Review cadence: ${parsed.data.reviewFrequency}`,
  });
  revalidateIsms("/methodology");
  redirect("/methodology?saved=1");
}

export async function createContextItemAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/context", "Your role is read-only.");
  const parsed = contextItemSchema.safeParse({
    type: formData.get("type"),
    party: formData.get("party"),
    description: formData.get("description"),
    needs: formData.get("needs"),
    relevance: formData.get("relevance"),
  });
  if (!parsed.success) invalid("/context", parsed.error.issues[0]?.message);

  const item = await db.contextItem.create({
    data: {
      workspaceId: context.workspace.id,
      type: parsed.data.type,
      party: parsed.data.party || null,
      description: parsed.data.description,
      needs: parsed.data.needs || null,
      relevance: parsed.data.relevance || null,
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "context.created",
    entityType: "Context",
    entityId: item.id,
    summary: `Added ${parsed.data.type === "PARTY" ? parsed.data.party : parsed.data.type.toLowerCase()} to the ISMS context`,
    detail: parsed.data.description,
  });
  revalidateIsms("/context");
  redirect("/context?saved=1");
}

export async function deleteContextItemAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/context", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const item = await db.contextItem.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!item) invalid("/context", "That context item was not found.");

  await db.contextItem.delete({ where: { id: item.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "context.deleted",
    entityType: "Context",
    entityId: item.id,
    summary: "Removed an ISMS context item",
    detail: item.party ?? item.description,
  });
  revalidateIsms("/context");
  redirect("/context?deleted=1");
}

export async function createRoleAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/roles", "Your role is read-only.");
  const parsed = ismsRoleSchema.safeParse({
    role: formData.get("role"),
    holder: formData.get("holder"),
    responsibilities: formData.get("responsibilities"),
    authority: formData.get("authority"),
    reportsTo: formData.get("reportsTo"),
  });
  if (!parsed.success) invalid("/roles", parsed.error.issues[0]?.message);

  const role = await db.ismsRole.create({
    data: {
      workspaceId: context.workspace.id,
      role: parsed.data.role,
      holder: parsed.data.holder || null,
      responsibilities: parsed.data.responsibilities,
      authority: parsed.data.authority || null,
      reportsTo: parsed.data.reportsTo || null,
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "role.created",
    entityType: "IsmsRole",
    entityId: role.id,
    summary: `Assigned the ${role.role} role`,
    detail: role.holder ?? "Holder not yet named",
  });
  revalidateIsms("/roles");
  redirect("/roles?saved=1");
}

export async function deleteRoleAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/roles", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const role = await db.ismsRole.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!role) invalid("/roles", "That role was not found.");
  await db.ismsRole.delete({ where: { id: role.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "role.deleted",
    entityType: "IsmsRole",
    entityId: role.id,
    summary: `Removed the ${role.role} role`,
  });
  revalidateIsms("/roles");
  redirect("/roles?deleted=1");
}

export async function createObjectiveAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/objectives", "Your role is read-only.");
  const parsed = objectiveSchema.safeParse({
    title: formData.get("title"),
    measure: formData.get("measure"),
    target: formData.get("target"),
    owner: formData.get("owner"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    progressNote: formData.get("progressNote"),
  });
  if (!parsed.success) invalid("/objectives", parsed.error.issues[0]?.message);

  const objective = await db.objective.create({
    data: {
      workspaceId: context.workspace.id,
      title: parsed.data.title,
      measure: parsed.data.measure,
      target: parsed.data.target || null,
      owner: parsed.data.owner || null,
      dueDate: parseDateInput(parsed.data.dueDate),
      status: parsed.data.status,
      progressNote: parsed.data.progressNote || null,
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "objective.created",
    entityType: "Objective",
    entityId: objective.id,
    summary: `Set the objective “${objective.title}”`,
    detail: objective.target ?? objective.measure,
  });
  revalidateIsms("/objectives");
  redirect("/objectives?saved=1");
}

export async function updateObjectiveAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/objectives", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const parsed = objectiveProgressSchema.safeParse({
    status: formData.get("status"),
    progressNote: formData.get("progressNote"),
  });
  if (!parsed.success) invalid("/objectives", parsed.error.issues[0]?.message);

  const objective = await db.objective.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!objective) invalid("/objectives", "That objective was not found.");
  await db.objective.update({
    where: { id: objective.id },
    data: { status: parsed.data.status, progressNote: parsed.data.progressNote || null },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "objective.status_changed",
    entityType: "Objective",
    entityId: objective.id,
    summary: `“${objective.title}” is now ${parsed.data.status.replaceAll("_", " ").toLowerCase()}`,
    detail: parsed.data.progressNote || null,
  });
  revalidateIsms("/objectives");
  redirect("/objectives?saved=1");
}

export async function deleteObjectiveAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/objectives", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const objective = await db.objective.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!objective) invalid("/objectives", "That objective was not found.");
  await db.objective.delete({ where: { id: objective.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "objective.deleted",
    entityType: "Objective",
    entityId: objective.id,
    summary: `Removed the objective “${objective.title}”`,
  });
  revalidateIsms("/objectives");
  redirect("/objectives?deleted=1");
}

export async function createInternalAuditAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/internal-audits", "Your role is read-only.");
  const parsed = internalAuditSchema.safeParse({
    title: formData.get("title"),
    auditDate: formData.get("auditDate"),
    scope: formData.get("scope"),
    status: formData.get("status"),
    findings: formData.get("findings"),
  });
  if (!parsed.success) invalid("/internal-audits", parsed.error.issues[0]?.message);
  const auditDate = parseDateInput(parsed.data.auditDate);
  if (!auditDate) invalid("/internal-audits", "Enter a valid audit date.");

  const audit = await db.internalAudit.create({
    data: {
      workspaceId: context.workspace.id,
      title: parsed.data.title,
      auditDate,
      scope: parsed.data.scope,
      status: parsed.data.status,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
      findings: parsed.data.findings || null,
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "audit.created",
    entityType: "InternalAudit",
    entityId: audit.id,
    summary: `${parsed.data.status === "COMPLETED" ? "Recorded" : "Scheduled"} internal audit “${audit.title}”`,
    detail: audit.scope,
  });
  revalidateIsms("/internal-audits");
  redirect("/internal-audits?saved=1");
}

export async function completeInternalAuditAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/internal-audits", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const audit = await db.internalAudit.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!audit) invalid("/internal-audits", "That audit was not found.");
  await db.internalAudit.update({
    where: { id: audit.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "audit.completed",
    entityType: "InternalAudit",
    entityId: audit.id,
    summary: `Completed internal audit “${audit.title}”`,
    detail: audit.scope,
  });
  revalidateIsms("/internal-audits");
  redirect("/internal-audits?saved=1");
}

export async function deleteInternalAuditAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/internal-audits", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const audit = await db.internalAudit.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!audit) invalid("/internal-audits", "That audit was not found.");
  await db.internalAudit.delete({ where: { id: audit.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "audit.deleted",
    entityType: "InternalAudit",
    entityId: audit.id,
    summary: `Removed internal audit “${audit.title}”`,
  });
  revalidateIsms("/internal-audits");
  redirect("/internal-audits?deleted=1");
}

export async function createManagementReviewAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/management-reviews", "Your role is read-only.");
  const parsed = managementReviewSchema.safeParse({
    reviewDate: formData.get("reviewDate"),
    attendees: formData.get("attendees"),
    decisions: formData.get("decisions"),
  });
  if (!parsed.success) invalid("/management-reviews", parsed.error.issues[0]?.message);
  const reviewDate = parseDateInput(parsed.data.reviewDate);
  if (!reviewDate) invalid("/management-reviews", "Enter a valid review date.");

  const review = await db.managementReview.create({
    data: {
      workspaceId: context.workspace.id,
      reviewDate,
      attendees: parsed.data.attendees,
      decisions: parsed.data.decisions,
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "management_review.logged",
    entityType: "ManagementReview",
    entityId: review.id,
    summary: "Logged a management review",
    detail: parsed.data.attendees,
  });
  revalidateIsms("/management-reviews");
  redirect("/management-reviews?saved=1");
}

export async function deleteManagementReviewAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/management-reviews", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const review = await db.managementReview.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!review) invalid("/management-reviews", "That review was not found.");
  await db.managementReview.delete({ where: { id: review.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "management_review.deleted",
    entityType: "ManagementReview",
    entityId: review.id,
    summary: "Removed a management review record",
  });
  revalidateIsms("/management-reviews");
  redirect("/management-reviews?deleted=1");
}

export async function createTrainingRecordAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/training", "Your role is read-only.");
  const parsed = trainingRecordSchema.safeParse({
    course: formData.get("course"),
    assignee: formData.get("assignee"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) invalid("/training", parsed.error.issues[0]?.message);

  const record = await db.trainingRecord.create({
    data: {
      workspaceId: context.workspace.id,
      course: parsed.data.course,
      assignee: parsed.data.assignee,
      dueDate: parseDateInput(parsed.data.dueDate),
    },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "training.assigned",
    entityType: "Training",
    entityId: record.id,
    summary: `Assigned “${record.course}” to ${record.assignee}`,
    detail: record.dueDate ? `Due ${record.dueDate.toISOString().slice(0, 10)}` : null,
  });
  revalidateIsms("/training");
  redirect("/training?saved=1");
}

export async function completeTrainingAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/training", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const record = await db.trainingRecord.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!record) invalid("/training", "That training record was not found.");
  await db.trainingRecord.update({
    where: { id: record.id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "training.completed",
    entityType: "Training",
    entityId: record.id,
    summary: `Completed “${record.course}”`,
    detail: record.assignee,
  });
  revalidateIsms("/training");
  redirect("/training?saved=1");
}

export async function deleteTrainingRecordAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) invalid("/training", "Your role is read-only.");
  const id = String(formData.get("id") ?? "");
  const record = await db.trainingRecord.findFirst({ where: { id, workspaceId: context.workspace.id } });
  if (!record) invalid("/training", "That training record was not found.");
  await db.trainingRecord.delete({ where: { id: record.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "training.deleted",
    entityType: "Training",
    entityId: record.id,
    summary: `Removed the training record for ${record.assignee}`,
  });
  revalidateIsms("/training");
  redirect("/training?deleted=1");
}
