import { apiHandler, ApiError, getApiContext } from "@/lib/api";
import { markdownFilename, policyMarkdown } from "@/lib/services/exports";

export const dynamic = "force-dynamic";

/** Single policy download, mirroring the reference app's Markdown export. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const [{ id }, context] = await Promise.all([params, getApiContext(request)]);
    const markdown = await policyMarkdown(context.workspaceId, id);
    if (!markdown) throw new ApiError(404, "Policy not found.", "policy_not_found");

    const title = markdown.split("\n")[0]?.replace(/^#\s*/, "") ?? "policy";
    return new Response(markdown, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${markdownFilename(title)}"`,
        "cache-control": "no-store",
      },
    });
  });
}
