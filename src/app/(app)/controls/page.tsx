import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowUpRight, ClipboardCheck, FilePlus2, Filter, FolderUp, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ControlStatusSelect } from "@/components/controls/control-status-select";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlMeta, coverage, listControls } from "@/lib/services/controls";
import { updateControlStatusAction } from "@/actions/controls";
import { cn } from "@/lib/utils";
import type { ControlStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Controls & SoA" };
export const dynamic = "force-dynamic";

const STATUSES: { value: ControlStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
];

export default async function ControlsPage({
  searchParams,
}: {
  searchParams: Promise<{ framework?: string; category?: string; status?: string; q?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const status = STATUSES.some((item) => item.value === params.status) ? (params.status as ControlStatus | "ALL") : "ALL";
  const writable = canWrite(context.role);

  const [controls, meta, totals] = await Promise.all([
    listControls(context.workspace.id, {
      framework: params.framework,
      category: params.category,
      status,
      q: params.q,
    }),
    controlMeta(context.workspace.id),
    coverage(context.workspace.id),
  ]);

  const grouped = Array.from(
    controls.reduce((map, row) => {
      const key = `${row.control.framework.key}::${row.control.category}`;
      const entry = map.get(key) ?? {
        framework: row.control.framework,
        category: row.control.category,
        rows: [] as typeof controls,
      };
      entry.rows.push(row);
      map.set(key, entry);
      return map;
    }, new Map<string, { framework: { key: string; name: string }; category: string; rows: typeof controls }>()),
  ).sort((a, b) => a[1].framework.name.localeCompare(b[1].framework.name) || a[1].category.localeCompare(b[1].category));

  const filtered = Boolean(params.framework || params.category || (params.status && params.status !== "ALL") || params.q);
  const activeFramework = meta.frameworks.find((framework) => framework.key === params.framework);

  return (
    <div>
      <PageHeader
        eyebrow="Statement of Applicability"
        title="Controls & SoA"
        description="Every framework control enabled for this workspace. Set applicability, record implementation status, and see exactly which policy, risk and artifact supports each row."
        actions={
          <>
            <Link href="/evidence#upload" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FolderUp className="size-3.5" /> Add evidence
            </Link>
            <Link href="/policies/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <FilePlus2 className="size-3.5" /> New policy
            </Link>
          </>
        }
      />

      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{params.error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_repeat(3,minmax(0,0.7fr))]">
        <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">Overall coverage</p>
            <ClipboardCheck className="size-4 text-brand" />
          </div>
          <div className="mt-2 flex items-end gap-2">
            <p className="font-mono text-[30px] leading-none tracking-[-0.04em] text-ink">{totals.percent}%</p>
            <p className="pb-0.5 text-[10px] text-faint">
              {totals.IMPLEMENTED}/{totals.applicable} applicable
            </p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-mint" style={{ width: `${totals.percent}%` }} />
          </div>
          <p className="mt-2 text-[9.5px] text-faint">{totals.total} controls enabled across {meta.frameworks.length} frameworks</p>
        </div>
        {[
          { label: "Implemented", value: totals.IMPLEMENTED, tone: "text-emerald-300", dot: "bg-mint" },
          { label: "In progress", value: totals.IN_PROGRESS, tone: "text-sky-300", dot: "bg-brand" },
          { label: "Not started", value: totals.NOT_STARTED, tone: "text-amber-300", dot: "bg-warning" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">
              <span className={cn("size-1.5 rounded-full", stat.dot)} /> {stat.label}
            </p>
            <p className={cn("mt-2 font-mono text-[30px] leading-none tracking-[-0.04em]", stat.tone)}>{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">
              {stat.label === "Not started" ? `${totals.NOT_APPLICABLE} marked not applicable` : "of enabled controls"}
            </p>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Search reference or control…" className="pl-8" aria-label="Search controls" />
            </div>
            <Select name="framework" defaultValue={params.framework ?? ""} className="w-auto min-w-[150px]" aria-label="Filter by framework">
              <option value="">All frameworks</option>
              {meta.frameworks.map((framework) => (
                <option key={framework.key} value={framework.key}>
                  {framework.name}
                </option>
              ))}
            </Select>
            <Select name="category" defaultValue={params.category ?? ""} className="w-auto min-w-[130px]" aria-label="Filter by category">
              <option value="">All categories</option>
              {meta.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Select name="status" defaultValue={status} className="w-auto min-w-[120px]" aria-label="Filter by status">
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Filter className="size-3.5" /> Filter
            </button>
            {filtered ? (
              <Link href="/controls" className="px-1 text-[10.5px] text-faint hover:text-ink">
                Clear
              </Link>
            ) : null}
          </form>

          {controls.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ShieldCheck}
                title="No controls match those filters"
                description="Try a broader search, or clear the framework, category and status filters."
                action={
                  <Link href="/controls" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                    Clear filters
                  </Link>
                }
              />
            </div>
          ) : (
            <div>
              {activeFramework ? (
                <div className="flex items-center gap-2 border-b border-line-soft bg-brand/[0.035] px-4 py-2 text-[10.5px] text-sky-200">
                  <ShieldCheck className="size-3" /> Viewing {activeFramework.name}
                </div>
              ) : null}

              {grouped.map(([key, group]) => (
                <section key={key}>
                  <div className="flex items-center justify-between gap-3 border-y border-line-soft bg-canvas/30 px-4 py-2 first:border-t-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">{group.framework.name}</span>
                      <span className="text-[9px] text-faint">· {group.category}</span>
                    </div>
                    <span className="text-[9px] text-faint">{group.rows.length} controls</span>
                  </div>
                  <div className="divide-y divide-line-soft">
                    {group.rows.map((row) => (
                      <div key={row.id} className="group grid gap-2 px-4 py-3 transition-colors hover:bg-white/[0.018] md:grid-cols-[92px_minmax(0,1fr)_180px_150px] md:items-start">
                        <div className="flex items-center gap-2 md:block">
                          <span className="inline-block rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9.5px] text-muted">
                            {row.control.ref}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-medium leading-snug text-ink">{row.control.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-faint">{row.control.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-faint">
                          <span className="flex items-center gap-1" title="Linked policies">
                            <FilePlus2 className="size-2.5" /> {row.control.policies.length} polic{row.control.policies.length === 1 ? "y" : "ies"}
                          </span>
                          <span className="flex items-center gap-1" title="Linked risks">
                            <AlertTriangle className="size-2.5" /> {row.control.risks.length} risk{row.control.risks.length === 1 ? "" : "s"}
                          </span>
                          <span className="flex items-center gap-1" title="Linked evidence">
                            <FolderUp className="size-2.5" /> {row.control.evidence.length}
                          </span>
                          <div className="mt-1 flex w-full gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              href={`/evidence?controlId=${row.control.id}#upload`}
                              className="text-[9px] text-sky-200/80 hover:text-sky-100"
                            >
                              + evidence
                            </Link>
                            <Link
                              href={`/policies/new?control=${row.control.id}`}
                              className="text-[9px] text-sky-200/80 hover:text-sky-100"
                            >
                              + policy
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center md:justify-end">
                          <ControlStatusSelect
                            controlId={row.control.id}
                            status={row.status}
                            disabled={!writable}
                            action={updateControlStatusAction}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-faint">
        <p>
          {controls.length} control{controls.length === 1 ? "" : "s"} shown. Status changes save immediately and update readiness.
        </p>
        <Link href="/policies" className="flex items-center gap-1 text-sky-200/70 hover:text-sky-100">
          Policy coverage by control <ArrowUpRight className="size-2.5" />
        </Link>
      </div>

      {!writable ? (
        <p className="mt-3 rounded-lg border border-line bg-panel/50 px-3 py-2 text-[10px] text-faint">
          Your role is read-only. Status changes are disabled.
        </p>
      ) : null}
      <p className="mt-3 text-[9px] text-faint">
        {totals.NOT_APPLICABLE} controls are marked not applicable and excluded from the coverage denominator. The statement of
        applicability is generated from this record.
      </p>
    </div>
  );
}
