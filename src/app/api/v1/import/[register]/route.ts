import { revalidatePath } from "next/cache";
import { apiHandler, ApiError, assertSameOrigin, getApiContext, readJson } from "@/lib/api";
import { canWrite } from "@/lib/rbac";
import { importPoliciesCsv, importRisksCsv, type ImportOutcome } from "@/lib/services/imports";

export const dynamic = "force-dynamic";

async function readBody(request: Request) {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File && file.size > 0) return file.text();
    return String(form.get("csv") ?? "");
  }

  if (type.includes("application/json")) {
    const body = await readJson<{ csv?: string }>(request);
    return String(body.csv ?? "");
  }

  return request.text();
}

/**
 * Register import. Accepts a CSV file upload, a JSON `{ csv }` body or a raw
 * text/csv body, so the UI, curl and the templates all use one endpoint.
 */
export async function POST(request: Request, { params }: { params: Promise<{ register: string }> }) {
  return apiHandler(async () => {
    assertSameOrigin(request);
    const [{ register }, context] = await Promise.all([params, getApiContext(request)]);
    if (register !== "policies" && register !== "risks") {
      throw new ApiError(404, "Only the policy and risk registers accept imports.", "register_not_importable");
    }
    if (!canWrite(context.role)) {
      throw new ApiError(403, "Your role is read-only in this workspace.", "read_only_role");
    }

    const csv = await readBody(request);
    if (!csv.trim()) throw new ApiError(400, "Send a CSV file or paste its contents.", "empty_import");

    const outcome: ImportOutcome =
      register === "policies"
        ? await importPoliciesCsv(context.workspaceId, context.user, csv)
        : await importRisksCsv(context.workspaceId, context.user, csv);

    if ("error" in outcome) {
      return Response.json({ error: outcome.error, issues: outcome.issues ?? [] }, { status: 422 });
    }

    revalidatePath(`/${register}`);
    revalidatePath("/dashboard");
    revalidatePath("/activity");
    revalidatePath("/readiness");

    return Response.json(outcome);
  });
}
