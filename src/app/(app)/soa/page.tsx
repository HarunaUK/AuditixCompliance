import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Filter,
  FolderOpen,
  Search,
  ShieldQuestion,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge, ControlBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { listSoa, soaSummary } from "@/lib/services/soa";
import { saveSoaDecisionAction } from "@/actions/soa";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Statement of Applicability" };
export const dynamic = "force-dynamic";

const DECISIONS = [
  { value: "ALL", label: "All controls" },
  { value: "APPLICABLE", label: "Applicable only" },
  { value: "EXCLUDED", label: "Excluded only" },
  { value: "GAPS", label: "Open gaps" },
] as const;

export default async function SoaPage({
  searchParams,
}: {
  searchParams: Promise<{ framework?: string; decision?: string; q?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const decision = DECISIONS.some((item) => item.value === params.decision) ? params.decision! : "ALL";

  const [rows, summary] = await Promise.all([
    listSoa(context.workspace.id, {
      framework: params.framework,
      decision: decision as (typeof DECISIONS)[number]["value"],
      q: params.q,
    }),
    soaSummary(context.workspace.id),
  ]);

  const filtered = Boolean(params.framework || (params.decision && params.decision !== "ALL") || params.q);
  const grouped = Array.from(
    rows.reduce((map, row) => {
      const key = row.control.framework.key;
      const entry = map.get(key) ?? { framework: row.control.framework, rows: [] as typeof rows };
      entry.rows.push(row);
      map.set(key, entry);
      return map;
    }, new Map<string, { framework: { key: string; name: string }; rows: typeof rows }>()),
  ).sort((a, b) => a[1].framework.name.localeCompare(b[1].framework.name));

  return (
    <div>
      <PageHeader
        eyebrow="ISO 27001 · Clause 6.1.3"
        title="Statement of Applicability"
        description="Every framework control in scope, the decision to apply or exclude it, and the justification an auditor will read. A control without a written justification is treated as a readiness blocker."
        actions={
          <>
            <Link href="/api/soa/export" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Download className="size-3.5" /> Export SoA
            </Link>
            <Link href="/controls" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <ArrowRight className="size-3.5" /> Implementation status
            </Link>
          </>
        }
      />

      {params.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Decision saved for {params.saved}.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {params.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Controls in scope", value: summary.total, hint: `${summary.frameworks.length} frameworks enabled`, tone: "text-ink" },
          { label: "Applicable", value: summary.applicable, hint: `${summary.implemented} implemented`, tone: "text-sky-200" },
          { label: "Excluded", value: summary.excluded, hint: `${summary.justified} of ${summary.total} controls justified`, tone: "text-ink" },
          { label: "Evidence coverage", value: `${summary.applicable ? Math.round((summary.evidenced / summary.applicable) * 100) : 0}%`, hint: `${summary.evidenced} of ${summary.applicable} evidenced`, tone: "text-emerald-200" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={cn("mt-1.5 font-mono text-[24px] leading-none", stat.tone)}>{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      {summary.unjustified > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-warning/25 bg-warning/[0.05] px-3.5 py-2.5 text-[11px] text-amber-200">
          <ShieldQuestion className="size-3.5" />
          {summary.unjustified} control{summary.unjustified === 1 ? "" : "s"} still need a written applicability justification.
          <Link href="/soa?decision=GAPS" className="ml-auto inline-flex items-center gap-1 font-medium hover:text-amber-100">
            Review controls <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}

      <Card className="mt-4">
        <CardContent className="p-0">
          <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Search reference or control…" className="pl-8" aria-label="Search controls" />
            </div>
            <Select name="framework" defaultValue={params.framework ?? ""} className="w-auto min-w-[160px]" aria-label="Filter by framework">
              <option value="">All frameworks</option>
              {summary.frameworks.map((framework) => (
                <option key={framework.key} value={framework.key}>
                  {framework.name}
                </option>
              ))}
            </Select>
            <Select name="decision" defaultValue={decision} className="w-auto min-w-[140px]" aria-label="Filter by decision">
              {DECISIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Filter className="size-3.5" /> Filter
            </button>
            {filtered ? (
              <Link href="/soa" className="px-1 text-[10.5px] text-faint hover:text-ink">
                Clear
              </Link>
            ) : null}
          </form>

          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ShieldQuestion}
                title="No controls match those filters"
                description="Try another search, or clear the framework and decision filters."
                action={
                  <Link href="/soa" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Clear filters
                  </Link>
                }
              />
            </div>
          ) : (
            <div>
              {grouped.map(([key, group]) => (
                <section key={key}>
                  <div className="flex items-center justify-between gap-3 border-y border-line-soft bg-canvas/30 px-4 py-2 first:border-t-0">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">{group.framework.name}</span>
                    <span className="text-[9px] text-faint">{group.rows.length} controls</span>
                  </div>
                  <div className="divide-y divide-line-soft">
                    {group.rows.map((row) => {
                      const excluded = row.status === "NOT_APPLICABLE";
                      const missingJustification = !row.justification?.trim();
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "grid gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.018]",
                            writable ? "xl:grid-cols-[74px_minmax(0,1fr)_minmax(0,420px)_150px]" : "xl:grid-cols-[74px_minmax(0,1fr)_minmax(0,1fr)_150px]",
                          )}
                        >
                          <div>
                            <span className="inline-block rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9.5px] text-muted">
                              {row.control.ref}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11.5px] font-medium leading-snug text-ink">{row.control.title}</p>
                            <p className="mt-0.5 text-[9.5px] text-faint">{row.control.category}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <ControlBadge status={row.status} />
                              {row.control.policies.length ? (
                                <Badge tone="outline">{row.control.policies.length} polic{row.control.policies.length === 1 ? "y" : "ies"}</Badge>
                              ) : null}
                              {row.control.risks.length ? (
                                <Badge tone="outline">{row.control.risks.length} risk{row.control.risks.length === 1 ? "" : "s"}</Badge>
                              ) : null}
                              {row.control.evidence.length ? (
                                <Badge tone="mint">{row.control.evidence.length} evidence</Badge>
                              ) : null}
                            </div>
                            {row.justification ? (
                              <p className="mt-2 rounded-md border border-line-soft bg-canvas/40 px-2 py-1.5 text-[10px] leading-relaxed text-muted">
                                <span className="font-medium text-faint">Justification: </span>
                                {row.justification}
                              </p>
                            ) : null}
                            {missingJustification ? (
                              <p className="mt-2 flex items-center gap-1 text-[10px] text-amber-200">
                                <AlertTriangle className="size-3" /> No applicability justification recorded.
                              </p>
                            ) : null}
                          </div>

                          <div>
                            {writable ? (
                              <form action={saveSoaDecisionAction} className="flex flex-wrap items-start gap-1.5">
                                <input type="hidden" name="controlId" value={row.control.id} />
                                <Select name="applicable" defaultValue={excluded ? "no" : "yes"} className="w-auto min-w-[98px]" aria-label={`Applicability for ${row.control.ref}`}>
                                  <option value="yes">Applicable</option>
                                  <option value="no">Excluded</option>
                                </Select>
                                <Input
                                  name="justification"
                                  defaultValue={row.justification ?? ""}
                                  placeholder="Why this control applies or is excluded…"
                                  className="min-w-[150px] flex-1"
                                  aria-label={`Justification for ${row.control.ref}`}
                                />
                                <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                                  Save
                                </button>
                              </form>
                            ) : (
                              <p className="text-[10.5px] text-faint">{row.justification ?? "No justification recorded."}</p>
                            )}
                          </div>

                          <div className="flex items-start justify-end gap-2 xl:flex-col xl:items-end">
                            <Link href={`/controls?q=${encodeURIComponent(row.control.ref)}`} className="text-[10px] text-sky-200 hover:text-sky-100">
                              Open control
                            </Link>
                            <Link href={`/evidence?controlId=${row.control.id}`} className="flex items-center gap-1 text-[10px] text-faint hover:text-ink">
                              <FolderOpen className="size-3" /> Evidence
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-[10px] leading-relaxed text-faint">
        Every control needs a written applicability justification of at least 10 characters, whether it applies or is excluded.
        The decision is timestamped and written to the workspace audit trail; the export carries the same columns an auditor expects
        in the SoA workbook.
      </p>
    </div>
  );
}
