import { apiHandler, getApiContext } from "@/lib/api";
import { getEvidenceForDownload } from "@/lib/services/evidence";
import { readStoredFile, safeName } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const context = await getApiContext(request);
    const { id } = await params;
    const evidence = await getEvidenceForDownload(context.workspaceId, id);
    if (!evidence) {
      return Response.json({ error: "Evidence not found in this workspace.", code: "not_found" }, { status: 404 });
    }

    const bytes = await readStoredFile(evidence.storageKey);
    return new Response(new Blob([new Uint8Array(bytes)], { type: evidence.mimeType }), {
      headers: {
        "Content-Type": evidence.mimeType,
        "Content-Disposition": `attachment; filename="${safeName(evidence.fileName)}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
