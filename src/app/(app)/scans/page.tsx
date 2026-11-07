import type { Metadata } from "next";
import { AlertTriangle, Plus, Radar, ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { createScanAction, deleteScanAction, recordScanResultAction } from "@/actions/scans";

export const metadata: Metadata = { title: "Vulnerability scans" };
export const dynamic = "force-dynamic";

const SEVERITY = [
  { key: "critical", label: "Critical", tone: "text-red-300" },
  { key: "high", label: "High", tone: "text-amber-300" },
  { key: "medium", label: "Medium", tone: "text-sky-300" },
  { key: "low", label: "Low", tone: "text-muted" },
] as const;

export default async function ScansPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [query, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const writable = canWrite(context.role);

  const [scans, assets] = await Promise.all([
    db.vulnerabilityScan.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.asset.findMany({
      where: { workspaceId: context.workspace.id, inScope: true },
      select: { id: true, name: true, location: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  const openFindings = scans.reduce((sum, scan) => sum + scan.critical + scan.high, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Offensive · Annex A.8.8"
        title="Scans"
        description="Automated scans catch known issues in internet-facing assets. Record the target, then log the findings so remediation can be tracked to closure."
        actions={
          <Badge tone={openFindings > 0 ? "amber" : "neutral"}>
            <ShieldAlert className="size-3" /> {openFindings} critical/high open
          </Badge>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/[0.05] p-3">
        <Radar className="mt-0.5 size-3.5 shrink-0 text-sky-300" />
        <p className="text-[10.5px] leading-relaxed text-sky-100/80">
          Need a manual penetration test? Automated scans catch known issues — for a hands-on assessment by a human tester, contact
          your account team.
        </p>
      </div>

      {query.error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          <AlertTriangle className="size-3.5" /> {query.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Scan register</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">{scans.length} scan{scans.length === 1 ? "" : "s"} recorded in this workspace.</p>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {scans.length ? (
              <div className="divide-y divide-line-soft">
                {scans.map((scan) => (
                  <div key={scan.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-mono text-[11.5px] text-ink">{scan.target}</p>
                          <Badge tone={scan.status === "COMPLETE" ? "mint" : scan.status === "QUEUED" ? "brand" : "neutral"} dot>
                            {scan.status === "QUEUED" ? "Queued" : scan.status === "COMPLETE" ? "Complete" : "Running"}
                          </Badge>
                          <Badge tone="outline">{scan.kind}</Badge>
                        </div>
                        <p className="mt-1 text-[10px] text-faint">
                          {scan.requestedBy ? `Requested by ${scan.requestedBy} · ` : ""}
                          {scan.completedAt
                            ? `Completed ${formatDateTime(scan.completedAt)}`
                            : `Queued ${formatDate(scan.createdAt)}`}
                        </p>
                      </div>
                      {writable ? (
                        <form action={deleteScanAction}>
                          <input type="hidden" name="id" value={scan.id} />
                          <DangerSubmit
                            variant="ghost"
                            size="icon"
                            className="size-7 text-faint hover:text-red-300"
                            message={`Remove the scan record for ${scan.target}?`}
                            aria-label="Remove scan"
                          >
                            <Trash2 className="size-3.5" />
                          </DangerSubmit>
                        </form>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {SEVERITY.map((severity) => (
                        <span key={severity.key} className="flex items-baseline gap-1">
                          <span className={cn("font-mono text-[13px] leading-none", severity.tone)}>
                            {scan[severity.key]}
                          </span>
                          <span className="text-[9px] uppercase tracking-[0.08em] text-faint">{severity.label}</span>
                        </span>
                      ))}
                      <span className="text-[9.5px] text-faint">· {scan.findings} findings</span>
                    </div>

                    {writable ? (
                      <details className="group mt-2.5">
                        <summary className="cursor-pointer list-none text-[10.5px] font-medium text-sky-300 hover:text-sky-200">
                          {scan.status === "COMPLETE" ? "Update findings" : "Record findings"}
                        </summary>
                        <form action={recordScanResultAction} className="mt-2 rounded-lg border border-line-soft bg-canvas/40 p-3">
                          <input type="hidden" name="id" value={scan.id} />
                          <div className="grid grid-cols-4 gap-2">
                            {SEVERITY.map((severity) => (
                              <label key={severity.key} className="block">
                                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.08em] text-faint">
                                  {severity.label}
                                </span>
                                <Input
                                  name={severity.key}
                                  type="number"
                                  min={0}
                                  defaultValue={scan[severity.key]}
                                  className="h-8 text-[11px]"
                                />
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
                              Save findings
                            </SubmitButton>
                          </div>
                        </form>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-14 text-center">
                <Radar className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No scans yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Add assets with IP addresses or URLs, then queue a scan. Findings are recorded against the scan so the report you
                  export matches what the tester saw.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>New scan</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Queue a target, then record what the scan returned.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createScanAction}>
              <Field label="Target" htmlFor="target" hint="A URL, hostname or CIDR range in scope.">
                <Input id="target" name="target" placeholder="https://app.example.com" required disabled={!writable} list="scan-assets" />
              </Field>
              <datalist id="scan-assets">
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.location ?? asset.name}>
                    {asset.name}
                  </option>
                ))}
              </datalist>
              <Field label="Scan type" htmlFor="kind" className="mb-0">
                <Select id="kind" name="kind" defaultValue="WEB" disabled={!writable}>
                  <option value="WEB">Web application</option>
                  <option value="INFRA">Infrastructure</option>
                  <option value="CLOUD">Cloud configuration</option>
                </Select>
              </Field>
              <div className="mt-4 flex justify-between border-t border-line-soft pt-4">
                <p className="self-center text-[9.5px] text-faint">Only scan assets you are authorised to test.</p>
                <SubmitButton variant="primary" pendingText="Queuing…" disabled={!writable}>
                  <Plus className="size-3.5" /> Queue
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
