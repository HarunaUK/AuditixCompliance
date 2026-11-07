"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { recordActivity } from "@/lib/services/activity";
import { canWrite } from "@/lib/rbac";
import { evidenceSchema } from "@/lib/validation";
import { saveFile, StorageError, deleteStoredFile } from "@/lib/storage";
import { createEvidence, deleteEvidence } from "@/lib/services/evidence";
import type { EvidenceKind } from "@prisma/client";

export type EvidenceActionState = { error?: string } | null;

export async function uploadEvidenceAction(
  _state: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) return { error: "Your role is read-only in this workspace." };

  const parsed = evidenceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    kind: formData.get("kind"),
    policyId: formData.get("policyId"),
    riskId: formData.get("riskId"),
    controlId: formData.get("controlId"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the evidence details." };

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Enter a valid expiry date." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to upload." };

  let stored: Awaited<ReturnType<typeof saveFile>>;
  try {
    stored = await saveFile(file, context.workspace.id);
  } catch (error) {
    return { error: error instanceof StorageError ? error.message : "Could not store that file." };
  }

  try {
    await createEvidence(context.workspace.id, context.user.id, {
      ...stored,
      name: parsed.data.name,
      description: parsed.data.description || null,
      kind: parsed.data.kind as EvidenceKind,
      policyId: parsed.data.policyId || null,
      riskId: parsed.data.riskId || null,
      controlId: parsed.data.controlId || null,
      expiresAt,
    });
  } catch (error) {
    await deleteStoredFile(stored.storageKey);
    return { error: error instanceof Error ? error.message : "Could not save the evidence record." };
  }

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "evidence.uploaded",
    entityType: "Evidence",
    entityId: null,
    summary: `Uploaded evidence “${parsed.data.name}”`,
    detail: expiresAt ? `Valid until ${expiresAt.toISOString().slice(0, 10)}` : "No expiry recorded",
  });
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/evidence");
  revalidatePath("/dashboard");
  redirect(`/evidence?uploaded=${encodeURIComponent(parsed.data.name)}`);
}

export async function deleteEvidenceAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/evidence?error=Read-only+role");
  const evidenceId = String(formData.get("evidenceId") ?? "");
  const evidence = await db.evidence.findFirst({
    where: { id: evidenceId, workspaceId: context.workspace.id },
    select: { name: true },
  });
  const deleted = await deleteEvidence(context.workspace.id, evidenceId);
  if (deleted && evidence) {
    await recordActivity({
      workspaceId: context.workspace.id,
      actor: context.user,
      action: "evidence.deleted",
      entityType: "Evidence",
      entityId: evidenceId,
      summary: `Deleted evidence “${evidence.name}”`,
      detail: "Stored file removed",
    });
  }
  revalidatePath("/activity");
  revalidatePath("/readiness");
  revalidatePath("/evidence");
  redirect("/evidence?deleted=1");
}
