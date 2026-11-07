import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { policySchema } from "@/lib/validation";
import { deletePolicy, getPolicy, updatePolicy } from "@/lib/services/policies";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const { id } = await params;
    const policy = await getPolicy(context.workspaceId, id);
    if (!policy) throw new ApiError(404, "Policy not found in this workspace.", "not_found");
    return NextResponse.json({ data: policy });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot edit policies.", "forbidden");
    const { id } = await params;
    const existing = await getPolicy(context.workspaceId, id);
    if (!existing) throw new ApiError(404, "Policy not found in this workspace.", "not_found");

    const body = (await readJson<Record<string, unknown>>(request)) ?? {};
    const merged = {
      title: body.title ?? existing.title,
      category: body.category ?? existing.category,
      summary: body.summary ?? existing.summary ?? "",
      content: body.content ?? existing.content,
      reviewDueAt:
        body.reviewDueAt !== undefined
          ? body.reviewDueAt
          : existing.reviewDueAt
            ? existing.reviewDueAt.toISOString().slice(0, 10)
            : "",
      controlIds:
        body.controlIds !== undefined
          ? body.controlIds
          : existing.controls.map((row) => row.control.id),
    };
    const input = policySchema.parse(merged);
    const policy = await updatePolicy(context.workspaceId, id, context.user.id, input);
    return NextResponse.json({ data: policy });
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot delete policies.", "forbidden");
    const { id } = await params;
    const deleted = await deletePolicy(context.workspaceId, id);
    if (!deleted) throw new ApiError(404, "Policy not found in this workspace.", "not_found");
    return NextResponse.json({ data: { id, deleted: true } });
  });
}
