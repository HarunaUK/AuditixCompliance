import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Download, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { getWorkspaceContext } from "@/lib/workspace";
import { readinessReport } from "@/lib/services/readiness";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Readiness gate" };
export const dynamic = "force-dynamic";

const statusTone = {
  READY: "mint",
  IN_PROGRESS: "amber",
  BLOCKED: "red",
} as const;

export default async function ReadinessPage() {
  const { workspace } = await getWorkspaceContext();
  const report = await readinessReport(workspace.id);
  const visibleBlockers = report.blockers.slice(0, 12);

  return (
    <div>
      <PageHeader
        eyebrow="Audit readiness"
        title="Readiness gate"
        description={`A Stage 2 gate for ${workspace.name}, computed from the policies, risk register, SoA and evidence actually in this workspace — not a self-assessment score.`}
        actions={
          <>
            <Link href="/soa?decision=GAPS" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <ShieldCheck className="size-3.5" /> Review SoA gaps
            </Link>
            <a
              href="/api/v1/audit-package"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              title="Download SoA, risk register, policies and the readiness report as a ZIP"
            >
              <Download className="size-3.5" /> Auditor package
            </a>
            <Link href="/policies?status=DRAFT" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <ArrowRight className="size-3.5" /> Finish policies
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-brand/20 bg-[linear-gradient(155deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_58%)] p-5 ring-sheen">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              <Gauge className="size-3.5" /> Certification gate
            </div>
            <Badge tone={statusTone[report.status]} dot>
              {report.label}
            </Badge>
          </div>

          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <ProgressRing value={report.percent} size={126} stroke={9} />
            <div className="min-w-0">
              <p className="text-[15px] font-medium leading-snug tracking-[-0.015em] text-ink">{report.headline}</p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {report.completePhases} of {report.phases.length} phases complete · {report.blockers.length} open blocker
                {report.blockers.length === 1 ? "" : "s"} across the workspace.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={report.blockers.length ? "amber" : "mint"}>{report.blockers.length} blockers</Badge>
                <span className="text-[9.5px] text-faint">Recomputed live · {formatDateTime(report.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-line-soft pt-4 sm:grid-cols-3">
            {[
              { label: "Policies approved", value: `${report.phases.find((phase) => phase.key === "policies")?.percent ?? 0}%` },
              { label: "SoA implementation", value: `${report.phases.find((phase) => phase.key === "soa")?.percent ?? 0}%` },
              { label: "Evidence coverage", value: `${report.phases.find((phase) => phase.key === "evidence")?.percent ?? 0}%` },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-mono text-[18px] leading-none text-ink">{stat.value}</p>
                <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Gate blockers</CardTitle>
              <CardDescription>What is stopping a clean Stage 2 audit.</CardDescription>
            </div>
            <AlertTriangle className={cn("size-4", report.blockers.length ? "text-amber-300" : "text-mint")} />
          </CardHeader>
          <CardContent className="pt-0">
            {visibleBlockers.length ? (
              <ol className="space-y-1.5">
                {visibleBlockers.map((blocker, index) => (
                  <li key={`${blocker.phase}-${blocker.title}-${index}`}>
                    <Link
                      href={blocker.href}
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-warning/30 bg-warning/10 font-mono text-[8.5px] text-amber-200">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] leading-snug text-ink">{blocker.title}</span>
                        <span className="mt-0.5 block text-[9px] uppercase tracking-[0.06em] text-faint">{blocker.phase}</span>
                      </span>
                      <ArrowRight className="mt-0.5 size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-mint/20 bg-mint/[0.04] px-3 py-4 text-[11.5px] leading-relaxed text-emerald-200">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                No blockers. Every phase has what an auditor would ask for — keep the evidence and review cycle current.
              </div>
            )}
            {report.blockers.length > visibleBlockers.length ? (
              <p className="mt-2 px-2 text-[9.5px] text-faint">
                + {report.blockers.length - visibleBlockers.length} more blockers in the phase list.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 space-y-2.5">
        {report.phases.map((phase, index) => {
          const complete = phase.percent >= 100;
          return (
            <div key={phase.key} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px]",
                      complete ? "border-mint/30 bg-mint/10 text-emerald-200" : "border-line bg-raised text-faint",
                    )}
                  >
                    {complete ? <CheckCircle2 className="size-3.5" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[13px] font-semibold text-ink">{phase.title}</h2>
                      <Badge tone={complete ? "mint" : phase.percent >= 50 ? "brand" : "neutral"}>{phase.percent}%</Badge>
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-faint">{phase.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                      <span className="text-muted">{phase.metric}</span>
                      {phase.note ? <span className="text-faint">· {phase.note}</span> : null}
                    </div>
                  </div>
                </div>
                <Link href={phase.href} className="flex shrink-0 items-center gap-1 text-[10.5px] text-sky-200 hover:text-sky-100">
                  Open <ArrowRight className="size-3" />
                </Link>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className={cn("h-full rounded-full transition-[width]", complete ? "bg-mint" : "bg-gradient-to-r from-brand to-mint")}
                  style={{ width: `${phase.percent}%` }}
                />
              </div>

              {phase.blockers.length ? (
                <ul className="mt-3 space-y-1 border-t border-line-soft pt-2.5">
                  {phase.blockers.map((blocker) => (
                    <li key={blocker} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-amber-200/90">
                      <CircleDashed className="mt-0.5 size-3 shrink-0" /> {blocker}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 flex items-center gap-1.5 border-t border-line-soft pt-2 text-[10px] text-emerald-300/80">
                  <CheckCircle2 className="size-3" /> Phase complete.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-panel/50 px-4 py-3">
        <p className="text-[10px] leading-relaxed text-faint">
          Gate weights: policies 15%, risk register 20%, Statement of Applicability 20%, evidence 20%, incidents and suppliers
          15%, scope and review 5% each. A workspace is audit-ready only when the weighted score reaches 85% and no blocker
          remains. Exclusions count as complete only once justified.
        </p>
      </div>
    </div>
  );
}
