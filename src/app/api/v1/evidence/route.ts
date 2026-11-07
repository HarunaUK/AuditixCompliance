import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { evidenceSchema } from "@/lib/validation";
import { createEvidence, listEvidence } from "@/lib/services/evidence";
import { recordActivity } from "@/lib/services/activity";
import { deleteStoredFile, saveFile, StorageError } from "@/lib/storage";
import type { EvidenceKind } from "@prisma/client";

export const dynamic = "force-dynamic";

const KINDS = ["DOCUMENT", "SCREENSHOT", "LOG", "REPORT", "OTHER"];

export async function GET(request: Request) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const url = new URL(request.url);
    const requestedKind = url.searchParams.get("kind")?.toUpperCase();
    const requestedValidity = url.searchParams.get("validity")?.toUpperCase();
    const evidence = await listEvidence(context.workspaceId, {
      q: url.searchParams.get("q") ?? undefined,
      kind: requestedKind && KINDS.includes(requestedKind) ? (requestedKind as EvidenceKind) : "ALL",
      validity:
        requestedValidity === "EXPIRING" || requestedValidity === "EXPIRED" || requestedValidity === "NONE"
          ? requestedValidity
          : "ALL",
      policyId: url.searchParams.get("policyId") ?? undefined,
      riskId: url.searchParams.get("riskId") ?? undefined,
      controlId: url.searchParams.get("controlId") ?? undefined,
    });
    return NextResponse.json({ data: evidence, meta: { count: evidence.length, workspaceId: context.workspaceId } });
  });
}

export async function POST(request: Request) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot upload evidence.", "forbidden");

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiError(400, "Expected multipart form data with a file and metadata.", "invalid_body");
    }

    const input = evidenceSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      kind: formData.get("kind") ?? "DOCUMENT",
      policyId: formData.get("policyId") ?? "",
      riskId: formData.get("riskId") ?? "",
      controlId: formData.get("controlId") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
    });
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new ApiError(422, "Enter a valid expiry date.", "invalid_expiry");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(422, "Choose a file to upload.", "file_required");

    let stored: Awaited<ReturnType<typeof saveFile>>;
    try {
      stored = await saveFile(file, context.workspaceId);
    } catch (error) {
      throw new ApiError(422, error instanceof StorageError ? error.message : "Could not store that file.", "upload_rejected");
    }

    try {
      const evidence = await createEvidence(context.workspaceId, context.user.id, {
        ...stored,
        name: input.name,
        description: input.description || null,
        kind: input.kind as EvidenceKind,
        policyId: input.policyId || null,
        riskId: input.riskId || null,
        controlId: input.controlId || null,
        expiresAt,
      });
      await recordActivity({
        workspaceId: context.workspaceId,
        actor: context.user,
        action: "evidence.uploaded",
        entityType: "Evidence",
        entityId: evidence.id,
        summary: `Uploaded evidence “${evidence.name}”`,
        detail: expiresAt ? `Valid until ${expiresAt.toISOString().slice(0, 10)}` : "No expiry recorded",
      });
      return NextResponse.json({ data: evidence }, { status: 201 });
    } catch (error) {
      await deleteStoredFile(stored.storageKey);
      throw new ApiError(422, error instanceof Error ? error.message : "Could not save the evidence record.", "evidence_rejected");
    }
  });
}
