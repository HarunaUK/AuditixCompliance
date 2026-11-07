import type { Metadata } from "next";
import { Activity, Clock3, Plus, TimerReset } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { createImpactAction, deleteImpactAction } from "@/actions/registers";

export const metadata: Metadata = { title: "Business impact analysis" };
export const dynamic = "force-dynamic";

const PRIORITY_TONE: Record<string, BadgeProps["tone"]> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "brand",
  LOW: "neutral",
};

const IMPACT_LEVELS = [
  { value: 1, label: "1 · Negligible" },
  { value: 2, label: "2 · Minor" },
  { value: 3, label: "3 · Moderate" },
  { value: 4, label: "4 · Major" },
  { value: 5, label: "5 · Severe" },
];

const DIMENSIONS = [
  { name: "impactFinancial", label: "Financial" },
  { name: "impactOperational", label: "Operational" },
  { name: "impactRegulatory", label: "Regulatory" },
  { name: "impactReputational", label: "Reputational" },
  { name: "impactCustomer", label: "Customer" },
];

export default async function BiaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const [analyses, members] = await Promise.all([
    db.businessImpactAnalysis.findMany({
      where: { workspaceId: context.workspace.id },
      include: { owner: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const writable = canWrite(context.role);
  const critical = analyses.filter((row) => row.priority === "CRITICAL" || row.priority === "HIGH").length;
  const untested = analyses.filter((row) => !row.lastTestedAt).length;
  const withRto = analyses.filter((row) => row.rtoHours !== null);
  const avgRto = withRto.length
    ? Math.round(withRto.reduce((sum, row) => sum + (row.rtoHours ?? 0), 0) / withRto.length)
    : null;

  return (
    <div>
      <PageHeader
        eyebrow="Clause 8.2 · business continuity"
        title="Business impact"
        description="Identify the functions that matter, the impact of losing them, and the recovery time and point objectives that follow."
        actions={
          <a href="#add-bia" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-brand-strong px-3 text-[12px] font-medium text-white">
            <Plus className="size-3.5" /> Add analysis
          </a>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Functions analysed", value: analyses.length, hint: "in the continuity scope", icon: Activity, tone: "text-ink" },
          { label: "Critical or high", value: critical, hint: "priority functions", icon: TimerReset, tone: "text-amber-300" },
          { label: "Average RTO", value: avgRto === null ? "—" : `${avgRto}h`, hint: "where recorded", icon: Clock3, tone: "text-sky-300" },
          { label: "Untested", value: untested, hint: "no recovery test on record", icon: TimerReset, tone: untested > 0 ? "text-red-300" : "text-emerald-300" },
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

      <Card className="mt-4" id="add-bia">
        <details open={analyses.length === 0}>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Plus className="size-3.5 text-brand" /> Add a business impact analysis</span>
            <span className="text-[10px] text-faint">RTO, RPO, MTPD and impact dimensions</span>
          </summary>
          <CardContent className="border-t border-line-soft pt-4">
            {writable ? (
              <form action={createImpactAction} className="grid gap-x-4 md:grid-cols-3">
                <Field label="Business function" htmlFor="functionName">
                  <Input id="functionName" name="functionName" required placeholder="Customer onboarding" maxLength={140} />
                </Field>
                <Field label="Owner">
                  <Select name="ownerId" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.user.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select name="priority" defaultValue="MEDIUM">
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </Select>
                </Field>
                <Field label="RTO (hours)" hint="Recovery time objective">
                  <Input name="rtoHours" type="number" min={0} max={8760} placeholder="4" />
                </Field>
                <Field label="RPO (hours)" hint="Recovery point objective">
                  <Input name="rpoHours" type="number" min={0} max={8760} placeholder="1" />
                </Field>
                <Field label="MTPD (hours)" hint="Maximum tolerable period of disruption">
                  <Input name="mtpdHours" type="number" min={0} max={8760} placeholder="24" />
                </Field>
                <div className="md:col-span-3">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Impact if the function is lost</p>
                  <div className="grid gap-x-3 gap-y-0 sm:grid-cols-2 lg:grid-cols-5">
                    {DIMENSIONS.map((dimension) => (
                      <Field key={dimension.name} label={dimension.label}>
                        <Select name={dimension.name} defaultValue="3">
                          {IMPACT_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </Select>
                      </Field>
                    ))}
                  </div>
                </div>
                <Field label="Dependencies" className="md:col-span-2">
                  <Textarea name="dependencies" rows={2} placeholder="Core database, payment provider, identity service" maxLength={1000} />
                </Field>
                <Field label="Recovery resources">
                  <Textarea name="recoveryResources" rows={2} placeholder="Warm standby, runbook, key staff" maxLength={1000} />
                </Field>
                <div className="md:col-span-3">
                  <Button type="submit" variant="primary" size="sm">Save analysis</Button>
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
          {analyses.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Activity} title="No impact analyses yet" description="Start with the services customers notice first; those set the recovery objectives for everything they depend on." />
            </div>
          ) : (
            <div>
              {analyses.map((row) => {
                const peak = Math.max(row.impactFinancial, row.impactOperational, row.impactRegulatory, row.impactReputational, row.impactCustomer);
                return (
                  <div key={row.id} className="border-b border-line-soft px-4 py-3.5 last:border-b-0 hover:bg-white/[0.015]">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12px] font-medium text-ink">{row.functionName}</p>
                          <Badge tone={PRIORITY_TONE[row.priority] ?? "neutral"} dot>{titleCase(row.priority)}</Badge>
                        </div>
                        <p className="mt-0.5 text-[9.5px] text-faint">
                          {row.owner?.name ?? "Unassigned"} · last tested {formatDate(row.lastTestedAt, "never")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-[10px] text-faint">impact {peak}/5</p>
                        {writable ? <DeleteButton action={deleteImpactAction} id={row.id} label={`Delete ${row.functionName}`} /> : null}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[9px] text-muted">
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">RTO {row.rtoHours ?? "—"}h</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">RPO {row.rpoHours ?? "—"}h</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">MTPD {row.mtpdHours ?? "—"}h</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">Fin {row.impactFinancial}</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">Ops {row.impactOperational}</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">Reg {row.impactRegulatory}</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">Rep {row.impactReputational}</span>
                      <span className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5">Cust {row.impactCustomer}</span>
                    </div>
                    {row.dependencies ? <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-faint">Depends on: {row.dependencies}</p> : null}
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
