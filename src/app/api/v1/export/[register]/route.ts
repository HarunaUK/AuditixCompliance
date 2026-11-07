import { apiHandler, ApiError, getApiContext } from "@/lib/api";
import { csvFile } from "@/lib/csv";
import { isRegisterKey, registerCsv, registerTemplate } from "@/lib/services/exports";

export const dynamic = "force-dynamic";

/**
 * Register export. `?template=1` returns the header row only, so a user can
 * download a blank sheet, fill it in and feed it back through the importer.
 */
export async function GET(request: Request, { params }: { params: Promise<{ register: string }> }) {
  return apiHandler(async () => {
    const [{ register }, context] = await Promise.all([params, getApiContext(request)]);
    if (!isRegisterKey(register)) throw new ApiError(404, "Unknown register.", "register_not_found");

    const url = new URL(request.url);
    if (url.searchParams.get("template") === "1") {
      return csvFile(`${register}-template.csv`, registerTemplate(register));
    }

    const csv = await registerCsv(context.workspaceId, register);
    return csvFile(`${register}-${context.membership.workspace.slug}.csv`, csv);
  });
}
