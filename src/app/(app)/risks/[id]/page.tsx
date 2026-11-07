import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  FolderLock,
  PencilLine,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RiskMatrix } from "@/components/app/risk-matrix";
import { AddRiskActionForm } from "@/components/risks/add-risk-action-form";
import { Badge, RiskStatusBadge, ScoreBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { getRisk, riskMatrix } from "@/lib/services/risks";
import {
  addRiskActionAction,
  deleteRiskAction,
  removeRiskActionAction,
  toggleRiskActionAction,
} from "@/actions/risks";
import { cn, daysUntil, formatDate, formatDateTime, scoreBand, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const context = await getWorkspaceContext();
  const risk = await getRisk(context.workspace.id, id);
  return { title: risk?.title ?? "Risk" };
}

const bandClasses = {
  critical: { text: "text-red-200", border: "border-danger/30", bg: "bg-danger/[0.07]" },
  high: { text: "text-amber-200", border: "border-warning/30", bg: "bg-warning/[0.07]" },
  medium: { text: "text-sky-200", border: "border-brand/30", bg: "bg-brand/[0.07]" },
  low: { text: "text-emerald-200", border: "border-mint/30", bg: "bg-mint/[0.07]" },
};

export default async function RiskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await getWorkspaceContext();
  const risk = await getRisk(context.workspace.id, id);
  if (!risk) notFound();

  const [matrix] = await Promise.all([riskMatrix(context.workspace.id)]);
  const writable = canWrite(context.role);
  const band = scoreBand(risk.score);
  const colors = bandClasses[band.tone];
  const days = daysUntil(risk.dueDate);
  const completed = risk.actions.filter((action) => action.done).length;
  const progress = risk.actions.length ? Math.round((completed / risk.actions.length) * 100) : 0;
  const treatmentCopy: Record<string, string> = {
    MITIGATE: "Reduce likelihood or impact with controls and tracked actions.",
    ACCEPT: "Retain the risk with leadership sign-off and a review date.",
    TRANSFER: "Share the financial consequence with an insurer or contractual partner.",
    AVOID: "Stop the activity that creates the risk.",
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-[10.5px] text-faint">
        <Link href="/risks" className="inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft className="size-3" /> Risk register
        </Link>
        <span>/</span>
        <span className="truncate text-muted">{risk.title}</span>
      </div>

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Risk assessment updated.
        </div>
      ) : null}

      <PageHeader
        eyebrow={`${risk.category} · Risk assessment`}
        title={risk.title}
        description={`Owned by ${risk.owner.name}${risk.dueDate ? ` · treatment due ${formatDate(risk.dueDate)}` : ""}`}
        actions={
          writable ? (
            <Link href={`/risks/${risk.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <PencilLine className="size-3.5" /> Edit risk
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ScoreBadge score={risk.score} />
        <RiskStatusBadge status={risk.status} />
        <Badge tone="neutral">
          <Target className="size-2.5" /> {titleCase(risk.treatment)}
        </Badge>
        <Badge tone="outline">
          <UserRound className="size-2.5" /> {risk.owner.name}
        </Badge>
        {days !== null ? (
          <Badge tone={days < 0 ? "red" : days <= 7 ? "amber" : "outline"}>
            <CalendarClock className="size-2.5" />
            {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days to deadline`}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario</CardTitle>
              <Badge tone="outline">As assessed</Badge>
            </CardHeader>
            <CardContent className="pt-0 text-[12px] leading-[1.8] text-slate-300">
              {risk.description.split("\n").map((paragraph, index) => (
                <p key={index} className={cn(index > 0 && "mt-3")}>
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Treatment plan</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">
                  {completed} of {risk.actions.length} actions complete
                </p>
              </div>
              <Badge tone={progress === 100 && risk.actions.length > 0 ? "mint" : "amber"}>{progress}%</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-mint transition-[width]" style={{ width: `${progress}%` }} />
              </div>

              {risk.actions.length ? (
                <div className="divide-y divide-line-soft">
                  {risk.actions.map((action) => {
                    const actionDays = daysUntil(action.dueDate);
                    return (
                      <div key={action.id} className="group flex items-start gap-2.5 py-2.5">
                        <form action={toggleRiskActionAction} className="pt-0.5">
                          <input type="hidden" name="actionId" value={action.id} />
                          <input type="hidden" name="riskId" value={risk.id} />
                          <button
                            type="submit"
                            disabled={!writable}
                            aria-label={action.done ? `Reopen ${action.title}` : `Complete ${action.title}`}
                            className={cn(
                              "grid size-4 place-items-center rounded-full border transition-colors disabled:cursor-default",
                              action.done
                                ? "border-mint/50 bg-mint/15 text-mint"
                                : "border-line text-transparent hover:border-mint/40 hover:text-mint/60",
                            )}
                          >
                            {action.done ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                          </button>
                        </form>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-[11.5px] leading-snug", action.done ? "text-faint line-through" : "text-ink")}>
                            {action.title}
                          </p>
                          <p className="mt-0.5 text-[9.5px] text-faint">
                            {action.owner?.name ? `${action.owner.name} · ` : ""}
                            {action.dueDate ? `Due ${formatDate(action.dueDate)}` : "No due date"}
                            {!action.done && actionDays !== null && actionDays < 0 ? " · overdue" : ""}
                          </p>
                        </div>
                        {writable ? (
                          <form action={removeRiskActionAction} className="opacity-0 transition-opacity group-hover:opacity-100">
                            <input type="hidden" name="actionId" value={action.id} />
                            <input type="hidden" name="riskId" value={risk.id} />
                            <button
                              type="submit"
                              title="Remove action"
                              aria-label={`Remove ${action.title}`}
                              className="grid size-6 place-items-center rounded text-faint hover:bg-danger/10 hover:text-red-300"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-[10.5px] text-faint">
                  No treatment actions recorded. Add the first step below.
                </p>
              )}

              {writable ? <AddRiskActionForm action={addRiskActionAction} riskId={risk.id} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Linked controls</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Controls that reduce this risk or provide evidence of treatment.</p>
              </div>
              <Badge tone="brand">{risk.controls.length} linked</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {risk.controls.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {risk.controls.map((row) => (
                    <Link
                      key={row.control.id}
                      href={`/controls?framework=${row.control.framework.key}&q=${row.control.ref}`}
                      className="group flex items-start gap-2.5 rounded-xl border border-line bg-canvas/40 px-3 py-2.5 transition-colors hover:border-brand/30"
                    >
                      <span className="mt-0.5 rounded border border-brand/20 bg-brand/[0.07] px-1.5 py-0.5 font-mono text-[9px] text-sky-200">
                        {row.control.ref}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] leading-snug text-ink">{row.control.title}</span>
                        <span className="mt-0.5 block text-[9.5px] text-faint">{row.control.framework.name}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-amber-200/90">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  No controls are mapped to this risk. Link the controls that mitigate it to show treatment coverage.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Supporting evidence</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Artifacts that demonstrate the treatment is operating.</p>
              </div>
              <Link href={`/evidence?riskId=${risk.id}`} className="text-[10.5px] text-sky-200 hover:text-sky-100">
                Upload →
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {risk.evidence.length ? (
                <div className="space-y-1">
                  {risk.evidence.map((item) => (
                    <Link key={item.id} href="/evidence" className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                      <span className="grid size-7 place-items-center rounded-md border border-line bg-raised text-mint">
                        <FolderLock className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink">{item.name}</span>
                        <span className="block truncate text-[9.5px] text-faint">{item.fileName}</span>
                      </span>
                      <span className="text-[9.5px] text-faint">{formatDate(item.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-[10.5px] text-faint">
                  No evidence linked to this risk yet.
                </p>
              )}
            </CardContent>
          </Card>

          {writable ? (
            <details className="group rounded-2xl border border-line bg-panel p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint hover:text-red-300 [&::-webkit-details-marker]:hidden">
                Danger zone <Trash2 className="size-3.5" />
              </summary>
              <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                Deleting a risk also removes its treatment actions and mappings. Linked evidence remains in the repository.
              </p>
              <form action={deleteRiskAction} className="mt-3">
                <input type="hidden" name="riskId" value={risk.id} />
                <DangerSubmit
                  variant="danger"
                  size="sm"
                  className="w-full"
                  message={`Delete "${risk.title}" and all of its treatment actions? This cannot be undone.`}
                >
                  <Trash2 className="size-3.5" /> Delete this risk
                </DangerSubmit>
              </form>
            </details>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk score</CardTitle>
              <Badge tone={band.tone === "critical" ? "red" : band.tone === "high" ? "amber" : band.tone === "medium" ? "brand" : "mint"}>
                {band.label}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-end justify-between">
                <div>
                  <p className={cn("font-mono text-[42px] leading-none tracking-[-0.06em]", colors.text)}>{risk.score}</p>
                  <p className="mt-1 text-[10px] text-faint">out of 25</p>
                </div>
                <div className="space-y-1 text-right text-[10px] text-faint">
                  <p>
                    Likelihood <span className="font-mono text-ink">{risk.likelihood}</span>
                  </p>
                  <p>
                    Impact <span className="font-mono text-ink">{risk.impact}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-1">
                <div />
                {[1, 2, 3, 4, 5].map((impact) => (
                  <div key={impact} className="text-center font-mono text-[8px] text-faint">
                    {impact}
                  </div>
                ))}
                {[5, 4, 3, 2, 1].map((likelihood) => (
                  <div key={likelihood} className="contents">
                    <div className="flex items-center justify-center font-mono text-[8px] text-faint">{likelihood}</div>
                    {[1, 2, 3, 4, 5].map((impact) => {
                      const score = likelihood * impact;
                      const active = likelihood === risk.likelihood && impact === risk.impact;
                      const tone = score >= 20 ? "bg-danger/20" : score >= 12 ? "bg-warning/20" : score >= 6 ? "bg-brand/15" : "bg-mint/10";
                      return (
                        <div
                          key={impact}
                          className={cn(
                            "grid aspect-square place-items-center rounded-sm border text-[7px]",
                            tone,
                            active ? "border-white/70 ring-2 ring-white/20" : "border-transparent",
                          )}
                          title={`L${likelihood} × I${impact} = ${score}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-faint">
                Critical 20–25 · High 12–19 · Medium 6–11 · Low 1–5. Score changes when likelihood or impact is edited.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Treatment decision</CardTitle>
              <ShieldCheck className="size-4 text-mint" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className={cn("rounded-xl border px-3 py-2.5", colors.border, colors.bg)}>
                <p className={cn("text-[12px] font-medium", colors.text)}>{titleCase(risk.treatment)}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">{treatmentCopy[risk.treatment]}</p>
              </div>
              <div className="space-y-2 text-[10.5px]">
                {[
                  ["Risk owner", risk.owner.name],
                  ["Status", titleCase(risk.status)],
                  ["Deadline", risk.dueDate ? formatDate(risk.dueDate) : "Not set"],
                  ["Raised", formatDate(risk.createdAt)],
                  ["Last updated", formatDateTime(risk.updatedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-faint">{label}</span>
                    <span className="text-right text-muted">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio position</CardTitle>
              <ClipboardList className="size-4 text-faint" />
            </CardHeader>
            <CardContent>
              <RiskMatrix data={matrix} compact />
              <p className="mt-3 text-[10px] leading-relaxed text-faint">
                This cell is highlighted against every open and monitored risk in the workspace.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
