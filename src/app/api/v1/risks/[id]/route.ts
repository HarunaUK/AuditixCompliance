import { NextResponse } from "next/server";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { riskSchema } from "@/lib/validation";
import { deleteRisk, getRisk, updateRisk } from "@/lib/services/risks";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const { id } = await params;
    const risk = await getRisk(context.workspaceId, id);
    if (!risk) throw new ApiError(404, "Risk not found in this workspace.", "not_found");
    return NextResponse.json({ data: risk });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot edit risks.", "forbidden");
    const { id } = await params;
    const existing = await getRisk(context.workspaceId, id);
    if (!existing) throw new ApiError(404, "Risk not found in this workspace.", "not_found");

    const body = (await readJson<Record<string, unknown>>(request)) ?? {};
    const merged = {
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      category: body.category ?? existing.category,
      likelihood: body.likelihood ?? existing.likelihood,
      impact: body.impact ?? existing.impact,
      treatment: body.treatment ?? existing.treatment,
      status: body.status ?? existing.status,
      dueDate:
        body.dueDate !== undefined
          ? body.dueDate
          : existing.dueDate
            ? existing.dueDate.toISOString().slice(0, 10)
            : "",
      ownerId: body.ownerId ?? existing.ownerId,
      controlIds:
        body.controlIds !== undefined
          ? body.controlIds
          : existing.controls.map((row) => row.control.id),
    };
    const input = riskSchema.parse(merged);
    const risk = await updateRisk(context.workspaceId, id, existing.ownerId, input);
    return NextResponse.json({ data: risk });
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const context = await getApiContext(request);
    if (!canWrite(context.role)) throw new ApiError(403, "Your role cannot delete risks.", "forbidden");
    const { id } = await params;
    const deleted = await deleteRisk(context.workspaceId, id);
    if (!deleted) throw new ApiError(404, "Risk not found in this workspace.", "not_found");
    return NextResponse.json({ data: { id, deleted: true } });
  });
}
