"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { recordActivity } from "@/lib/services/activity";
import { canWrite } from "@/lib/rbac";
import { parseControlIds, policySchema, policyStatusSchema } from "@/lib/validation";
import { completeJson, AI_MODEL, AiError, aiConfigured } from "@/lib/ai";
import { isPolicyType, type PolicyType } from "@/lib/policy-types";
import { workspaceBrief } from "@/lib/services/assistant";
import {
  createPolicy,
  deletePolicy,
  setPolicyStatus,
  updatePolicy,
} from "@/lib/services/policies";

export type PolicyActionState = { error?: string } | null;

export async function createPolicyAction(
  _state: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  const parsed = policySchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    reviewDueAt: formData.get("reviewDueAt"),
    controlIds: parseControlIds(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the policy details." };

  const policy = await createPolicy(context.workspace.id, context.user.id, parsed.data);
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "policy.created",
    entityType: "Policy",
    entityId: policy.id,
    summary: `Created policy “${policy.title}”`,
    detail: `${policy.category} · draft v${policy.version}`,
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/policies");
  revalidatePath("/dashboard");
  redirect(`/policies/${policy.id}`);
}

type GeneratedPolicy = { title?: string; summary?: string; content?: string };

/**
 * Drafts a policy with the model and stores it as a DRAFT owned by the person
 * who asked for it. Nothing becomes authoritative until a human approves it, and
 * the model used is recorded on the record for the audit trail.
 */
export async function generatePolicyAction(
  _state: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  if (!aiConfigured()) return { error: "AI is not configured. Add AI_API_KEY to the environment first." };

  const requested = String(formData.get("policyType") ?? "");
  if (!isPolicyType(requested)) return { error: "Choose a policy type to generate." };
  const policyType: PolicyType = requested;

  const brief = await workspaceBrief(context.workspace.id);
  const existing = await db.policy.findMany({
    where: { workspaceId: context.workspace.id },
    select: { title: true },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const existingTitles = existing.map((policy) => policy.title).join(", ") || "none";

  const draft = (words: string, briefText: string) =>
    completeJson<GeneratedPolicy>(
      [
        {
          role: "system",
          content: `You write certification-ready information security policies for a GRC platform. Output JSON only, with the keys "title", "summary" and "content".

The content must be GitHub-flavoured Markdown and follow this shape:
1. Purpose
2. Scope
3. Policy statement (numbered requirements)
4. Roles and responsibilities
5. Related controls (cite ISO/IEC 27001:2022 Annex A references where relevant)
6. Compliance and review

Write ${words}, in force-defined language ("must", "shall"), specific to the organisation in the brief. Do not include a document control table, signatures or placeholders like [Company Name] — use the real workspace name. Do not mention that AI wrote it.`,
        },
        {
          role: "user",
          content: `Draft the ${policyType} for this organisation.\n\nWORKSPACE BRIEF\n${briefText}\n\nExisting policies (do not duplicate these): ${existingTitles}.`,
        },
      ],
      { maxTokens: 6000 },
    );

  let generated: GeneratedPolicy;
  try {
    generated = await draft("700-1100 words", brief.text);
  } catch (error) {
    // Reasoning models spend part of their budget thinking; when that leaves no
    // room for the document itself, retry once with a shorter brief and a terser
    // target instead of failing the whole generation.
    if (error instanceof AiError && /output space|output_token_limit/i.test(error.message)) {
      try {
        generated = await draft("450-650 words", brief.text.slice(0, 1200));
      } catch (retryError) {
        return {
          error:
            retryError instanceof AiError
              ? retryError.message
              : "The generator could not reach the AI provider. Try again.",
        };
      }
    } else {
      return {
        error:
          error instanceof AiError ? error.message : "The generator could not reach the AI provider. Try again.",
      };
    }
  }

  const title = (generated.title ?? policyType).trim().slice(0, 160) || policyType;
  const content = (generated.content ?? "").trim();
  if (content.length < 200) return { error: "The model returned an empty draft. Try again." };

  const reviewDue = new Date();
  reviewDue.setFullYear(reviewDue.getFullYear() + 1);

  const policy = await createPolicy(
    context.workspace.id,
    context.user.id,
    {
      title,
      category: policyType,
      summary: (generated.summary ?? `AI-drafted ${policyType.toLowerCase()} awaiting human review.`).slice(0, 400),
      content,
      reviewDueAt: reviewDue.toISOString().slice(0, 10),
      controlIds: [],
    },
    { aiGenerated: true, aiModel: AI_MODEL },
  );

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "policy.ai_generated",
    entityType: "Policy",
    entityId: policy.id,
    summary: `AI drafted “${policy.title}”`,
    detail: `${policyType} · ${AI_MODEL} · awaiting human approval`,
  });

  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/policies");
  revalidatePath("/dashboard");
  redirect(`/policies/${policy.id}?generated=1`);
}

export async function updatePolicyAction(
  _state: PolicyActionState,
  formData: FormData,
): Promise<PolicyActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };
  const policyId = String(formData.get("policyId") ?? "");
  const parsed = policySchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    summary: formData.get("summary"),
    content: formData.get("content"),
    reviewDueAt: formData.get("reviewDueAt"),
    controlIds: parseControlIds(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the policy details." };

  const policy = await updatePolicy(context.workspace.id, policyId, context.user.id, parsed.data);
  if (!policy) return { error: "Policy not found in this workspace." };
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "policy.updated",
    entityType: "Policy",
    entityId: policy.id,
    summary: `Updated policy “${policy.title}”`,
    detail: `Saved version ${policy.version}`,
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  redirect(`/policies/${policyId}?saved=1`);
}

export async function setPolicyStatusAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/policies?error=Read-only+role");
  const policyId = String(formData.get("policyId") ?? "");
  const parsed = policyStatusSchema.safeParse(formData.get("status"));
  if (!parsed.success) redirect("/policies?error=Invalid+status");

  const policy = await setPolicyStatus(context.workspace.id, policyId, parsed.data);
  if (policy) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "policy.status_changed",
      entityType: "Policy",
      entityId: policy.id,
      summary: `“${policy.title}” set to ${parsed.data.replaceAll("_", " ").toLowerCase()}`,
      detail: `Version ${policy.version}`,
    });
  }
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/dashboard");
  revalidatePath("/policies");
  revalidatePath(`/policies/${policyId}`);
  redirect(`/policies/${policyId}?status=updated`);
}

export async function deletePolicyAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/policies?error=Read-only+role");
  const policyId = String(formData.get("policyId") ?? "");
  const policy = await db.policy.findFirst({
    where: { id: policyId, workspaceId: context.workspace.id },
    select: { title: true },
  });
  const deleted = await deletePolicy(context.workspace.id, policyId);
  if (deleted && policy) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "policy.deleted",
      entityType: "Policy",
      entityId: policyId,
      summary: `Deleted policy “${policy.title}”`,
      detail: "Policy and version history removed",
    });
  }
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/policies");
  revalidatePath("/dashboard");
  redirect("/policies?deleted=1");
}
