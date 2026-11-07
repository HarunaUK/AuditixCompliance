import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Gauge, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/form";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import { createMeasurementAction, deleteMeasurementAction, updateMeasurementAction } from "@/actions/registers";

export const metadata: Metadata = { title: "Monitoring & measurement" };
export const dynamic = "force-dynamic";

const FREQUENCIES = ["Monthly", "Quarterly", "Half-yearly", "Yearly"] as const;
const DAYS: Record<string, number> = { Monthly: 31, Quarterly: 92, "Half-yearly": 183, Yearly: 366 };

function nextDue(lastMeasuredAt: Date | null, frequency: string) {
  if (!lastMeasuredAt) return null;
  const due = new Date(lastMeasuredAt);
  due.setDate(due.getDate() + (DAYS[frequency] ?? 92));
  return due;
}

export default async function MeasurementsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const [measurements, members] = await Promise.all([
    db.measurement.findMany({
      where: { workspaceId: context.workspace.id },
      include: { responsible: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const writable = canWrite(context.role);
  const now = Date.now();
  const recent = measurements.filter((row) => row.lastMeasuredAt && now - row.lastMeasuredAt.getTime() <= 30 * 86_400_000).length;
  const overdue = measurements.filter((row) => {
    const due = nextDue(row.lastMeasuredAt, row.frequency);
    return !due || due.getTime() < now;
  }).length;
  const unowned = measurements.filter((row) => !row.responsibleId).length;

  return (
    <div>
      <PageHeader
        eyebrow="Clause 9.1 · monitoring"
        title="Measurement"
        description="What you monitor, how often, against which target, and the latest result. Clause 9.1 asks you to evaluate security performance, not just collect dashboards."
        actions={
          <a href="#add-measurement" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-brand-strong px-3 text-[12px] font-medium text-white">
            <Plus className="size-3.5" /> Add measurement
          </a>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Measurements", value: measurements.length, hint: "defined metrics", icon: Gauge, tone: "text-ink" },
          { label: "Measured in 30 days", value: recent, hint: "current results", icon: CheckCircle2, tone: "text-emerald-300" },
          { label: "Overdue", value: overdue, hint: "past the review cadence", icon: CalendarClock, tone: overdue > 0 ? "text-amber-300" : "text-emerald-300" },
          { label: "Unowned", value: unowned, hint: "no responsible person", icon: Gauge, tone: unowned > 0 ? "text-red-300" : "text-emerald-300" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
              {stat.label} <stat.icon className="size-3.5 text-brand/80" />
            </p>
            <p className={cn("mt-2 font-mono text-[27px] leading-none tracking-[-0.04em]", stat.tone)}>{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      <Card className="mt-4" id="add-measurement">
        <details open={measurements.length === 0}>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Plus className="size-3.5 text-brand" /> Add a measurement</span>
            <span className="text-[10px] text-faint">Metric, method, cadence and target</span>
          </summary>
          <CardContent className="border-t border-line-soft pt-4">
            {writable ? (
              <form action={createMeasurementAction} className="grid gap-x-4 md:grid-cols-3">
                <Field label="Measurement" htmlFor="name" className="md:col-span-2">
                  <Input id="name" name="name" required placeholder="Percentage of endpoints with current EDR agent" maxLength={160} />
                </Field>
                <Field label="Frequency">
                  <Select name="frequency" defaultValue="Monthly">
                    {FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </Select>
                </Field>
                <Field label="Method">
                  <Input name="method" placeholder="EDR console export" maxLength={160} />
                </Field>
                <Field label="Responsible">
                  <Select name="responsibleId" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}
                  </Select>
                </Field>
                <Field label="Target">
                  <Input name="target" placeholder="≥ 98%" maxLength={80} />
                </Field>
                <Field label="Latest result">
                  <Input name="latestResult" placeholder="96.4%" maxLength={80} />
                </Field>
                <Field label="Last measured">
                  <Input name="lastMeasuredAt" type="date" className="[color-scheme:dark]" />
                </Field>
                <div className="mb-4 flex items-end pb-2 md:col-span-1">
                  <Button type="submit" variant="primary" size="sm">Save measurement</Button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-faint">Your role is read-only.</p>
            )}
          </CardContent>
        </details>
      </Card>

      <Card className="mt-3">
        <CardContent className="p-0">
          {measurements.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Gauge} title="No measurements defined" description="Pick a handful of metrics that show the controls working — patching, access review completion, backup restore success." />
            </div>
          ) : (
            <div>
              {measurements.map((row) => {
                const due = nextDue(row.lastMeasuredAt, row.frequency);
                const remaining = daysUntil(due);
                const late = remaining === null || remaining < 0;
                return (
                  <div key={row.id} className="border-b border-line-soft px-4 py-3.5 last:border-b-0 hover:bg-white/[0.015]">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_190px] md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11.5px] font-medium text-ink">{row.name}</p>
                          <Badge tone={late ? "amber" : "mint"} dot>{late ? "Due" : "Current"}</Badge>
                        </div>
                        <p className="mt-0.5 text-[9.5px] text-faint">
                          {row.method ?? "No method recorded"} · {row.responsible?.name ?? "Unassigned"}
                        </p>
                      </div>
                      <div className="text-[10px] text-muted">
                        <p>Target <span className="font-mono text-ink">{row.target ?? "—"}</span></p>
                        <p className="mt-0.5">
                          Latest <span className="font-mono text-ink">{row.latestResult ?? "—"}</span>
                          <span className="text-faint"> · {formatDate(row.lastMeasuredAt, "never")}</span>
                        </p>
                        <p className="mt-0.5 text-[9px] text-faint">
                          {row.frequency}
                          {remaining !== null ? ` · next due ${formatDate(due)}` : " · no result yet"}
                        </p>
                      </div>
                      <div>
                        {writable ? (
                          <div className="flex items-end gap-1.5">
                            <ActionForm action={updateMeasurementAction} className="flex flex-1 items-end gap-1.5">
                              <input type="hidden" name="id" value={row.id} />
                              <div className="min-w-0 flex-1">
                                <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">Record result</p>
                                <Input name="latestResult" defaultValue={row.latestResult ?? ""} placeholder="Value" className="h-7 text-[10px]" aria-label={`Latest result for ${row.name}`} />
                              </div>
                              <div>
                                <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">Date</p>
                                <Input
                                  name="lastMeasuredAt"
                                  type="date"
                                  defaultValue={row.lastMeasuredAt ? row.lastMeasuredAt.toISOString().slice(0, 10) : ""}
                                  className="h-7 w-[112px] text-[10px] [color-scheme:dark]"
                                  aria-label={`Measured date for ${row.name}`}
                                />
                              </div>
                              <Button type="submit" variant="secondary" size="sm" className="h-7 px-2 text-[10px]">Save</Button>
                            </ActionForm>
                            <div className="pb-1.5"><DeleteButton action={deleteMeasurementAction} id={row.id} label={`Delete ${row.name}`} /></div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
