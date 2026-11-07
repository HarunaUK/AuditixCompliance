import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowUpRight, CalendarClock, Filter, Plus, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RegisterTools } from "@/components/app/register-tools";
import { RiskMatrix } from "@/components/app/risk-matrix";
import { Badge, RiskStatusBadge, ScoreBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { getWorkspaceContext } from "@/lib/workspace";
import { listRisks, riskMatrix, riskSummary } from "@/lib/services/risks";
import { cn, daysUntil, formatDate, titleCase } from "@/lib/utils";
import type { RiskStatus, Treatment } from "@prisma/client";

export const metadata: Metadata = { title: "Risk register" };
export const dynamic = "force-dynamic";

const STATUSES: { value: RiskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "OPEN", label: "Open" },
  { value: "MONITORING", label: "Monitoring" },
  { value: "MITIGATED", label: "Mitigated" },
  { value: "CLOSED", label: "Closed" },
];

const TREATMENTS: { value: Treatment | "ALL"; label: string }[] = [
  { value: "ALL", label: "All treatments" },
  { value: "MITIGATE", label: "Mitigate" },
  { value: "ACCEPT", label: "Accept" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "AVOID", label: "Avoid" },
];

export default async function RisksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; treatment?: string; deleted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { workspace } = await getWorkspaceContext();
  const status = STATUSES.some((item) => item.value === params.status) ? (params.status as RiskStatus | "ALL") : "ALL";
  const treatment = TREATMENTS.some((item) => item.value === params.treatment)
    ? (params.treatment as Treatment | "ALL")
    : "ALL";

  const [risks, summary, matrix] = await Promise.all([
    listRisks(workspace.id, { q: params.q, status, treatment }),
    riskSummary(workspace.id),
    riskMatrix(workspace.id),
  ]);
  const filtered = Boolean(params.q || (params.status && params.status !== "ALL") || (params.treatment && params.treatment !== "ALL"));

  return (
    <div>
      <PageHeader
        eyebrow="Governance, risk & compliance"
        title="Risk register"
        description="Score what could go wrong, decide how to treat it, and keep every owner and deadline visible until the risk is closed."
        actions={
          <>
            <RegisterTools register="risks" importKind="risks" />
            <Link href="/risks/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <Plus className="size-3.5" /> New risk
            </Link>
          </>
        }
      />

      {params.deleted ? (
        <div className="mb-4 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          Risk and its treatment actions were deleted.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {params.error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Risks in register", value: summary.total, hint: `${summary.open} open`, icon: ShieldAlert, tone: "text-sky-300 border-brand/25 bg-brand/10" },
          { label: "Critical", value: summary.critical, hint: "Score 20–25", icon: AlertTriangle, tone: "text-red-300 border-danger/25 bg-danger/10" },
          { label: "High", value: summary.high, hint: "Score 12–19", icon: AlertTriangle, tone: "text-amber-300 border-warning/25 bg-warning/10" },
          { label: "Overdue treatment", value: summary.overdue, hint: "Past deadline", icon: CalendarClock, tone: "text-red-300 border-danger/25 bg-danger/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
              <span className={cn("grid size-6 place-items-center rounded-md border", stat.tone)}>
                <stat.icon className="size-3" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[21px] leading-none text-ink">{stat.value}</p>
            <p className="mt-1 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="p-0">
            <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search risks…" className="pl-8" aria-label="Search risks" />
              </div>
              <Select name="status" defaultValue={status} className="w-auto min-w-[120px]" aria-label="Filter by risk status">
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Select name="treatment" defaultValue={treatment} className="w-auto min-w-[132px]" aria-label="Filter by treatment">
                {TREATMENTS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Filter className="size-3.5" /> Filter
              </button>
              {filtered ? (
                <Link href="/risks" className="px-1 text-[10.5px] text-faint hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>

            {risks.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={ShieldCheck}
                  title={filtered ? "No risks match those filters" : "The risk register is empty"}
                  description={
                    filtered
                      ? "Try a broader search, or clear the status and treatment filters."
                      : "Start with the scenarios most likely to interrupt the business or expose customer data."
                  }
                  action={
                    filtered ? (
                      <Link href="/risks" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Clear filters
                      </Link>
                    ) : (
                      <Link href="/risks/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
                        <Plus className="size-3.5" /> Add the first risk
                      </Link>
                    )
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Risk</th>
                      <th className="px-3 py-2.5 font-semibold">Score</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Treatment</th>
                      <th className="px-3 py-2.5 font-semibold">Owner</th>
                      <th className="px-3 py-2.5 font-semibold">Deadline</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {risks.map((risk) => {
                      const days = daysUntil(risk.dueDate);
                      return (
                        <tr key={risk.id} className="group transition-colors hover:bg-white/[0.022]">
                          <td className="max-w-[300px] px-4 py-3">
                            <Link href={`/risks/${risk.id}`} className="block min-w-0">
                              <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-ink group-hover:text-sky-100">
                                {risk.title}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-faint">
                                {risk.category} · L{risk.likelihood}×I{risk.impact} ·{" "}
                                {risk._count.actions} action{risk._count.actions === 1 ? "" : "s"}
                              </span>
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <ScoreBadge score={risk.score} />
                          </td>
                          <td className="px-3 py-3">
                            <RiskStatusBadge status={risk.status} />
                          </td>
                          <td className="px-3 py-3 text-[10.5px] text-muted">{titleCase(risk.treatment)}</td>
                          <td className="px-3 py-3 text-[10.5px] text-muted">{risk.owner.name}</td>
                          <td className="px-3 py-3">
                            {risk.dueDate ? (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  days !== null && days < 0 ? "text-red-200" : "text-muted",
                                )}
                              >
                                <CalendarClock className="size-3 text-faint" />
                                {formatDate(risk.dueDate)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-faint">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/risks/${risk.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                              Open <ArrowUpRight className="size-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>5×5 risk matrix</CardTitle>
                <p className="mt-0.5 text-[10.5px] text-faint">Open and monitored risks only.</p>
              </div>
            </CardHeader>
            <CardContent>
              <RiskMatrix data={matrix} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk appetite</CardTitle>
              <Badge tone={summary.critical > 0 ? "red" : summary.high > 0 ? "amber" : "mint"} dot>
                {summary.critical > 0 ? "Above appetite" : summary.high > 0 ? "Watch" : "Within appetite"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0 text-[10.5px] leading-relaxed text-faint">
              <p>
                Critical and high risks need a documented treatment decision and a named owner. Accepted risks require leadership
                sign-off and a review date.
              </p>
              <div className="flex items-center justify-between border-t border-line-soft pt-2.5 text-muted">
                <span>Accepted risks</span>
                <span className="font-mono text-ink">{summary.accepted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Open status</span>
                <span className="font-mono text-ink">{summary.open}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
