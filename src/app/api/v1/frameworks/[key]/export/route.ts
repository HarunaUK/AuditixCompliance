import { apiHandler, ApiError, getApiContext } from "@/lib/api";
import { frameworkPack } from "@/lib/frameworks";

export const dynamic = "force-dynamic";

function cell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  return apiHandler(async () => {
    const [{ key }, context] = await Promise.all([params, getApiContext(request)]);
    const pack = await frameworkPack(context.workspaceId, key);
    if (!pack) throw new ApiError(404, "Framework pack not found.", "framework_not_found");

    const rows = [
      ["Reference", "Control", "Domain", "Status", "Owner", "Due", "Review", "Evidence", "Reused ISO evidence", "ISO mappings", "Notes"],
      ...pack.controls.map((control) => [
        control.ref,
        control.title,
        control.domainLabel,
        control.status,
        control.ownerId ?? "",
        control.dueDate ? control.dueDate.toISOString().slice(0, 10) : "",
        control.reviewFrequency ?? "",
        control.evidence.length,
        control.reused.length,
        control.iso.join(" "),
        control.note ?? "",
      ]),
    ];

    const csv = rows.map((row) => row.map(cell).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${pack.framework.key}-controls.csv"`,
        "cache-control": "no-store",
      },
    });
  });
}
