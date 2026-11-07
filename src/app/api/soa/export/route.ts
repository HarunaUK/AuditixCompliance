import { getWorkspaceContext } from "@/lib/workspace";
import { listSoa, soaCsv } from "@/lib/services/soa";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getWorkspaceContext();
  const rows = await listSoa(context.workspace.id);
  const csv = soaCsv(rows);
  return new Response(`\ufeff${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="statement-of-applicability-${context.workspace.slug}.csv"`,
      "cache-control": "no-store",
    },
  });
}
