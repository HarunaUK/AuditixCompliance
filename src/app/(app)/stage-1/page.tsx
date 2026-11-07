import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Gauge, Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { getWorkspaceContext } from "@/lib/workspace";
import { stage1Report } from "@/lib/services/stage1";
import { canWrite } from "@/lib/rbac";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Stage 1 readiness check" };
export const dynamic = "force-dynamic";

export default async function Stage1Page() {
  const context = await getWorkspaceContext();
  const report = await stage1Report(context.workspace.id);
  const writable = canWrite(context.role);
  const open = report.checks.filter((check) => !check.done);

  return (
    <div>
      <PageHeader
        eyebrow="Certification · Stage 1 gate"
        title="Stage 1 readiness check"
        description={`The ${report.total} prerequisites a lead auditor checks before Stage 2. Each item is computed from records in this workspace, not a self-assessment tick-box.`}
        actions={
          <>
            <Link href="/readiness" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Stage 2 readiness
            </Link>
            <Link href="/activity" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Audit trail
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="overflow-hidden rounded-2xl border border-brand/20 bg-[linear-gradient(155deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_58%)] p-5 ring-sheen">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              <Gauge className="size-3.5" /> Stage 1 gate
            </div>
            <Badge tone={report.ready ? "mint" : report.met >= 8 ? "amber" : "red"} dot>
              {report.ready ? "Prerequisites met" : report.met >= 8 ? "Almost ready" : "Not ready yet"}
            </Badge>
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={report.percent} size={126} stroke={9} />
            <div className="min-w-0">
              <p className="text-[15px] font-medium leading-snug tracking-[-0.015em] text-ink">
                {report.ready
                  ? "Every Stage 1 prerequisite is met. Keep the operating evidence warm."
                  : `${report.total - report.met} prerequisite${report.total - report.met === 1 ? "" : "s"} still open.`}
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                {report.met}/{report.total} met for {context.workspace.name}. Clear the red items below before inviting a
                certification body.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={open.length ? "amber" : "mint"}>{open.length} open</Badge>
                <span className="text-[9.5px] text-faint">Computed {formatDateTime(report.generatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-line-soft pt-4">
            <div className="flex items-start gap-2 rounded-xl border border-line bg-canvas/40 px-3 py-2.5 text-[10px] leading-relaxed text-faint">
              <Info className="mt-0.5 size-3.5 shrink-0 text-brand" />
              <span>
                This is Auditix&apos;s readiness gate, not a guarantee. The accredited certification body makes the final call at
                Stage 1 and Stage 2.
              </span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Open prerequisites</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Ordered by the clause an auditor will test first.</p>
            </div>
            <AlertTriangle className={cn("size-4", open.length ? "text-amber-300" : "text-mint")} />
          </CardHeader>
          <CardContent className="pt-0">
            {open.length ? (
              <ol className="space-y-1.5">
                {open.slice(0, 8).map((check, index) => (
                  <li key={check.key}>
                    <Link
                      href={check.href}
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-warning/30 bg-warning/10 font-mono text-[8.5px] text-amber-200">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] leading-snug text-ink">{check.title}</span>
                        <span className="mt-0.5 block text-[9px] uppercase tracking-[0.06em] text-faint">
                          {check.clause} · {check.detail}
                        </span>
                      </span>
                      <ArrowRight className="mt-0.5 size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-mint/20 bg-mint/[0.04] px-3 py-4 text-[11.5px] leading-relaxed text-emerald-200">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                No open prerequisites. The Stage 1 pack is in order — keep the audit trail and review cycle current.
              </div>
            )}
            {open.length > 8 ? (
              <p className="mt-2 px-2 text-[9.5px] text-faint">+ {open.length - 8} more in the full checklist below.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel ring-sheen">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">The {report.total} prerequisites</h2>
            <p className="mt-0.5 text-[10.5px] text-faint">ISO/IEC 27001:2022 and ISO/IEC 42001 Stage 1 evidence.</p>
          </div>
          <Badge tone={report.ready ? "mint" : "outline"}>
            {report.met}/{report.total} met
          </Badge>
        </div>

        <ol className="divide-y divide-line-soft">
          {report.checks.map((check, index) => (
            <li key={check.key}>
              <Link
                href={check.href}
                className={cn(
                  "group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.018]",
                  !check.done && "bg-warning/[0.015]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-[10px]",
                    check.done ? "border-mint/30 bg-mint/10 text-emerald-200" : "border-line bg-raised text-faint",
                  )}
                >
                  {check.done ? <CheckCircle2 className="size-3.5" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-medium leading-snug text-ink">{check.title}</p>
                    <Badge tone={check.done ? "mint" : "amber"}>{check.done ? "Met" : "To do"}</Badge>
                    <span className="text-[9px] uppercase tracking-[0.07em] text-faint">{check.clause}</span>
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-faint">{check.description}</p>
                  <p className={cn("mt-1 text-[10px]", check.done ? "text-emerald-300/80" : "text-amber-200/90")}>{check.detail}</p>
                </div>
                <ArrowRight className="mt-1 size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ol>

        <div className="border-t border-line px-4 py-3">
          <div className="flex flex-wrap items-start gap-2 rounded-xl border border-line bg-canvas/40 px-3 py-2.5 text-[10px] leading-relaxed text-faint">
            <CircleDashed className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <span className="text-muted">Advisory: </span>
              {report.advisory.title} — {report.advisory.detail}
              {report.advisory.done ? " Satisfied." : ""}
            </span>
          </div>
        </div>
      </div>

      {!writable ? (
        <p className="mt-3 text-[10px] text-faint">
          Your role is read-only. Ask a workspace admin or member to update the records behind each prerequisite.
        </p>
      ) : null}
    </div>
  );
}
