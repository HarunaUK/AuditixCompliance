import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BookLock,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileWarning,
  FolderLock,
  GraduationCap,
  ListChecks,
  Network,
  Plus,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { RiskMatrix } from "@/components/app/risk-matrix";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWorkspaceContext } from "@/lib/workspace";
import { dashboardData } from "@/lib/services/dashboard";
import { stage1Report } from "@/lib/services/stage1";
import { toggleRiskActionAction } from "@/actions/risks";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const activityTone: Record<string, { icon: LucideIcon; className: string }> = {
  Policy: { icon: BookLock, className: "border-brand/25 bg-brand/10 text-sky-300" },
  Risk: { icon: ShieldCheck, className: "border-warning/25 bg-warning/10 text-amber-300" },
  Evidence: { icon: FolderLock, className: "border-mint/25 bg-mint/10 text-emerald-300" },
  Control: { icon: ClipboardCheck, className: "border-violet/25 bg-violet/10 text-indigo-300" },
  Workspace: { icon: Building2, className: "border-line bg-raised text-muted" },
  Member: { icon: UsersRound, className: "border-line bg-raised text-muted" },
  Profile: { icon: Building2, className: "border-line bg-raised text-muted" },
  Context: { icon: Network, className: "border-brand/25 bg-brand/10 text-sky-300" },
  Scope: { icon: ScanLine, className: "border-brand/25 bg-brand/10 text-sky-300" },
  Methodology: { icon: SlidersHorizontal, className: "border-warning/25 bg-warning/10 text-amber-300" },
  Objective: { icon: Target, className: "border-mint/25 bg-mint/10 text-emerald-300" },
  IsmsRole: { icon: UserCog, className: "border-violet/25 bg-violet/10 text-indigo-300" },
  InternalAudit: { icon: ClipboardList, className: "border-brand/25 bg-brand/10 text-sky-300" },
  ManagementReview: { icon: CalendarCheck, className: "border-violet/25 bg-violet/10 text-indigo-300" },
  Training: { icon: GraduationCap, className: "border-mint/25 bg-mint/10 text-emerald-300" },
};

export default async function DashboardPage() {
  const { workspace, user } = await getWorkspaceContext();
  const data = await dashboardData(workspace.id);

  const pendingReviews = data.policiesDue.length;
  const controlGap = data.controls.applicable - data.controls.IMPLEMENTED;

  return (
    <div>
      <PageHeader
        eyebrow="Workspace overview"
        title={`${workspace.name} compliance`}
        description="Where certification stands today, what needs a decision, and the evidence behind it — across every framework in scope."
        actions={
          <>
            <Link href="/evidence#upload" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FolderLock className="size-3.5" /> Upload evidence
            </Link>
            <Link href="/risks/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <Plus className="size-3.5" /> New risk
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Control coverage"
          value={`${data.controls.percent}%`}
          hint={`${data.controls.IMPLEMENTED} of ${data.controls.applicable} applicable controls implemented`}
          icon={ClipboardCheck}
          tone="brand"
        />
        <StatCard
          label="Active risks"
          value={data.risks.total - data.risks.accepted}
          hint={`${data.risks.critical} critical · ${data.risks.high} high · ${data.openActions} actions due`}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Policies approved"
          value={`${data.policies.APPROVED}/${data.policies.ALL}`}
          hint={`${data.policies.IN_REVIEW} in review · ${pendingReviews} reviews due in 30 days`}
          icon={BookLock}
          tone="violet"
        />
        <StatCard
          label="Evidence artefacts"
          value={data.evidence.count}
          hint={
            data.evidence.expired
              ? `${data.evidence.expired} expired · ${data.evidence.expiring} expiring soon`
              : `${data.evidence.linked} linked · ${data.evidence.expiring} expiring soon`
          }
          icon={FileWarning}
          tone={data.evidence.expired ? "amber" : "mint"}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div>
                <CardTitle>Certification readiness</CardTitle>
                <CardDescription>Implementation progress against applicable Annex A and Cyber Essentials controls.</CardDescription>
              </div>
              <Badge tone={data.controls.percent >= 70 ? "mint" : data.controls.percent >= 40 ? "amber" : "neutral"} dot>
                {data.controls.percent >= 70 ? "On track" : data.controls.percent >= 40 ? "Needs attention" : "Getting started"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-5">
                  <ProgressRing value={data.controls.percent} size={112} stroke={8} />
                  <div className="space-y-2.5">
                    {[
                      { label: "Implemented", value: data.controls.IMPLEMENTED, color: "bg-mint" },
                      { label: "In progress", value: data.controls.IN_PROGRESS, color: "bg-brand" },
                      { label: "Not started", value: data.controls.NOT_STARTED, color: "bg-slate-600" },
                      { label: "Not applicable", value: data.controls.NOT_APPLICABLE, color: "bg-line" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2 text-[11px]">
                        <span className={cn("size-1.5 rounded-full", row.color)} />
                        <span className="w-[92px] text-muted">{row.label}</span>
                        <span className="font-mono text-ink">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-4 border-t border-line-soft pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  {data.frameworks.map((framework) => (
                    <div key={framework.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-[11.5px] text-muted">{framework.name}</span>
                        <span className="font-mono text-[10.5px] text-faint">
                          {framework.implemented}/{framework.applicable}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-mint transition-[width]"
                          style={{ width: `${framework.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {controlGap > 0 ? (
                    <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
                      <TrendingUp className="mt-0.5 size-3 shrink-0 text-brand" />
                      Close {controlGap} remaining control{controlGap === 1 ? "" : "s"} to reach full coverage.
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[10.5px] text-emerald-300">
                      <CheckCircle2 className="size-3" /> Every applicable control is implemented.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                <Link href="/soa" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  Open Statement of Applicability <ArrowRight className="size-3" />
                </Link>
                <span className="text-[10.5px] text-faint">
                  {data.controls.total} controls enabled · updated automatically as you work
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Risk posture</CardTitle>
                  <CardDescription>Live exposure across open and monitored risks.</CardDescription>
                </div>
                <Link href="/risks" className="text-[10.5px] text-sky-200 hover:text-sky-100">
                  Register →
                </Link>
              </CardHeader>
              <CardContent>
                <RiskMatrix data={data.matrix} />
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-4">
                  <div>
                    <p className="font-mono text-[19px] leading-none text-ink">{data.risks.critical}</p>
                    <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-red-300/80">Critical</p>
                  </div>
                  <div>
                    <p className="font-mono text-[19px] leading-none text-ink">{data.risks.high}</p>
                    <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-amber-300/80">High</p>
                  </div>
                  <div>
                    <p className="font-mono text-[19px] leading-none text-ink">{data.risks.overdue}</p>
                    <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Policy review queue</CardTitle>
                  <CardDescription>Approved policies approaching their next review.</CardDescription>
                </div>
                <CalendarClock className="size-4 text-faint" />
              </CardHeader>
              <CardContent>
                {data.policiesDue.length ? (
                  <div className="space-y-1">
                    {data.policiesDue.map((policy) => {
                      const days = daysUntil(policy.reviewDueAt);
                      return (
                        <Link
                          key={policy.id}
                          href={`/policies/${policy.id}`}
                          className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                        >
                          <span
                            className={cn(
                              "mt-1.5 size-1.5 shrink-0 rounded-full",
                              days !== null && days < 0 ? "bg-danger" : days !== null && days <= 14 ? "bg-warning" : "bg-brand",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11.5px] font-medium text-ink group-hover:text-sky-100">
                              {policy.title}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-faint">
                              {days !== null && days < 0
                                ? `${Math.abs(days)} days overdue`
                                : `Due ${formatDate(policy.reviewDueAt)}`}
                            </span>
                          </span>
                          <ArrowUpRight className="mt-0.5 size-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[11px] text-faint">
                    No approved policy reviews due in the next 30 days.
                  </p>
                )}
                <div className="mt-3 border-t border-line-soft pt-3 text-[10.5px] text-faint">
                  Review window closes {data.reviewWindow}.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Treatment actions</CardTitle>
                <CardDescription>Open work assigned from the risk register.</CardDescription>
              </div>
              <Badge tone="amber">{data.openActions} open</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {data.actions.length ? (
                <div className="divide-y divide-line-soft">
                  {data.actions.map((action) => {
                    const days = daysUntil(action.dueDate);
                    return (
                      <div key={action.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <form action={toggleRiskActionAction} className="pt-0.5">
                          <input type="hidden" name="actionId" value={action.id} />
                          <input type="hidden" name="riskId" value={action.risk.id} />
                          <button
                            type="submit"
                            aria-label={`Mark ${action.title} complete`}
                            className="grid size-4 place-items-center rounded border border-line bg-canvas text-transparent transition-colors hover:border-mint/50 hover:text-mint"
                          >
                            <CheckCircle2 className="size-3" />
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11.5px] leading-snug text-ink">{action.title}</p>
                          <Link href={`/risks/${action.risk.id}`} className="mt-0.5 block truncate text-[10px] text-faint hover:text-sky-200">
                            {action.risk.title}
                          </Link>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px]",
                            days !== null && days < 0
                              ? "border-danger/30 bg-danger/10 text-red-200"
                              : days !== null && days <= 7
                                ? "border-warning/30 bg-warning/10 text-amber-200"
                                : "border-line bg-raised text-faint",
                          )}
                        >
                          {days === null ? "No date" : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-mint/20 bg-mint/[0.04] px-3 py-4 text-[11.5px] text-emerald-200">
                  <Sparkles className="size-4" /> No treatment actions are open. The register is under control.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="h-[248px] animate-pulse rounded-2xl border border-brand/15 bg-brand/[0.04]" />
            }
          >
            <AuditReadinessCard workspaceId={workspace.id} controlGap={controlGap} />
          </Suspense>

          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <span className="text-[10px] text-faint">Latest changes</span>
            </CardHeader>
            <CardContent className="pt-0">
              {data.activity.length ? (
                <div className="space-y-0.5">
                  {data.activity.map((item) => {
                    const config = activityTone[item.kind] ?? activityTone.Workspace;
                    const Icon = config.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="group flex items-start gap-2.5 rounded-lg px-1.5 py-2 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border", config.className)}>
                          <Icon className="size-3" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-medium text-ink">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[9.5px] capitalize text-faint">
                            {item.kind}
                            {item.detail ? ` · ${item.detail}` : ""}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-[11px] text-faint">Activity will appear as the team works.</p>
              )}
            </CardContent>
          </Card>

          {data.expiring.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Evidence expiring soon</CardTitle>
                <Link href="/evidence?validity=EXPIRING" className="text-[10px] text-sky-200 hover:text-sky-100">
                  Open evidence →
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {data.expiring.map((item) => {
                  const days = daysUntil(item.expiresAt);
                  return (
                    <Link
                      key={item.id}
                      href={`/evidence?q=${encodeURIComponent(item.name)}`}
                      className="group flex items-start gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/[0.03]"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          days !== null && days < 0 ? "bg-danger" : days !== null && days <= 14 ? "bg-warning" : "bg-brand",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[10.5px] font-medium text-ink group-hover:text-sky-100">{item.name}</span>
                        <span className="mt-0.5 block text-[9px] text-faint">
                          {item.control ? `${item.control.ref} · ` : ""}
                          {days !== null && days < 0 ? `expired ${Math.abs(days)}d ago` : `valid until ${formatDate(item.expiresAt)}`}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Workspace pulse</CardTitle>
              <CircleDot className="size-3.5 text-mint" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                { icon: BookLock, label: "Draft policies", value: data.policies.DRAFT, href: "/policies?status=DRAFT" },
                { icon: ShieldCheck, label: "Open risks", value: data.risks.open, href: "/risks?status=OPEN" },
                { icon: FolderLock, label: "Evidence this workspace", value: data.evidence.count, href: "/evidence" },
                { icon: ListChecks, label: "Team members", value: data.members, href: "/settings" },
              ].map((row) => (
                <Link key={row.label} href={row.href} className="flex items-center gap-2.5 text-[11.5px] text-muted transition-colors hover:text-ink">
                  <row.icon className="size-3.5 text-faint" strokeWidth={1.7} />
                  <span className="flex-1">{row.label}</span>
                  <span className="font-mono text-[11px] text-ink">{row.value}</span>
                  <ArrowUpRight className="size-2.5 text-faint" />
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-line bg-panel/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Signed in as</p>
            <p className="mt-1.5 text-[12px] font-medium text-ink">{user.name}</p>
            <p className="text-[10.5px] text-faint">{user.email}</p>
            <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-faint">
              <Clock3 className="size-3" /> Session protected by HttpOnly cookies
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/50 px-4 py-3">
        <p className="text-[11px] text-faint">
          Showing live data for <span className="text-muted">{workspace.name}</span>. Every query is scoped to this workspace.
        </p>
        <div className="flex gap-2">
          <Link href="/policies/new" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Plus className="size-3" /> Add policy
          </Link>
          <Link href="/risks/new" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Plus className="size-3" /> Add risk
          </Link>
        </div>
      </div>
    </div>
  );
}

async function AuditReadinessCard({ workspaceId, controlGap }: { workspaceId: string; controlGap: number }) {
  const stage1 = await stage1Report(workspaceId);

  return (
    <div className="overflow-hidden rounded-2xl border border-brand/20 bg-[linear-gradient(155deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_55%)] p-5 ring-sheen">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
        <Sparkles className="size-3.5" /> Audit readiness
      </div>
      <p className="mt-3 text-[17px] font-medium leading-snug tracking-[-0.02em] text-ink">
        {stage1.ready
          ? "The Stage 1 gate is clear. Keep the operating evidence warm."
          : stage1.met >= 8
            ? "Close the last Stage 1 prerequisites before the external audit."
            : "Start with the ISMS prerequisites an auditor asks about first."}
      </p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
        {stage1.total - stage1.met} of {stage1.total} Stage 1 prerequisites still open, and {controlGap} applicable
        control{controlGap === 1 ? "" : "s"} still need implementation.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-[21px] leading-none text-ink">{stage1.met}/{stage1.total}</span>
        <span className="text-[9.5px] uppercase tracking-[0.08em] text-faint">prerequisites met</span>
      </div>
      <Link href="/stage-1" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-4 w-full")}>
        Open the Stage 1 check <ArrowRight className="size-3.5" />
      </Link>
      <Link href="/readiness" className="mt-2 block text-center text-[10px] text-sky-200 transition-colors hover:text-sky-100">
        Stage 2 readiness gate →
      </Link>
      <Link href="/activity" className="mt-1 block text-center text-[10px] text-faint transition-colors hover:text-sky-200">
        View the audit trail
      </Link>
    </div>
  );
}
