import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Plus, Target, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createObjectiveAction, deleteObjectiveAction, updateObjectiveAction } from "@/actions/isms";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import type { ObjectiveStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Security objectives" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  NOT_STARTED: "Not started",
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  MET: "Met",
  MISSED: "Missed",
};

const STATUS_TONE: Record<ObjectiveStatus, "neutral" | "brand" | "amber" | "mint" | "red"> = {
  NOT_STARTED: "neutral",
  ON_TRACK: "brand",
  AT_RISK: "amber",
  MET: "mint",
  MISSED: "red",
};

export default async function ObjectivesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const objectives = await db.objective.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  const met = objectives.filter((objective) => objective.status === "MET").length;
  const atRisk = objectives.filter((objective) => objective.status === "AT_RISK" || objective.status === "MISSED").length;

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Clause 6.2"
        title="Security objectives"
        description="Measurable information-security objectives, how each one is measured, who owns it and when it is due. The Stage 1 gate expects at least one, and an auditor will ask for the evidence behind the status."
        actions={
          <Link href="/readiness" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Stage 2 readiness
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Objectives updated.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Objective removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Objectives", value: objectives.length, tone: "text-ink" },
          { label: "Met", value: met, tone: "text-emerald-200" },
          { label: "At risk / missed", value: atRisk, tone: atRisk ? "text-amber-200" : "text-ink" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={cn("mt-1.5 font-mono text-[23px] leading-none", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {objectives.length ? (
            objectives.map((objective) => {
              const days = daysUntil(objective.dueDate);
              return (
                <Card key={objective.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={STATUS_TONE[objective.status]} dot>
                            {STATUS_LABEL[objective.status]}
                          </Badge>
                          {objective.owner ? <span className="text-[10px] text-faint">Owner · {objective.owner}</span> : null}
                          {objective.dueDate ? (
                            <span
                              className={cn(
                                "text-[10px]",
                                days !== null && days < 0 ? "text-red-300" : days !== null && days <= 14 ? "text-amber-300" : "text-faint",
                              )}
                            >
                              Due {formatDate(objective.dueDate)}
                              {days !== null && days < 0 ? ` · ${Math.abs(days)}d overdue` : days !== null ? ` · ${days}d left` : ""}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-2 text-[13px] font-semibold leading-snug text-ink">{objective.title}</h2>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                          <span className="text-faint">Measured by: </span>
                          {objective.measure}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                          <span className="text-faint">
                            Target <span className="text-muted">{objective.target ?? "Not set"}</span>
                          </span>
                        </div>
                        {objective.progressNote ? (
                          <p className="mt-2 rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted">
                            {objective.progressNote}
                          </p>
                        ) : null}
                      </div>
                      {writable ? (
                        <form action={deleteObjectiveAction}>
                          <input type="hidden" name="id" value={objective.id} />
                          <DangerSubmit
                            variant="ghost"
                            size="icon"
                            className="size-7 text-faint hover:text-red-300"
                            message={`Remove the objective “${objective.title}”?`}
                            aria-label="Remove objective"
                          >
                            <Trash2 className="size-3.5" />
                          </DangerSubmit>
                        </form>
                      ) : null}
                    </div>

                    {writable ? (
                      <form action={updateObjectiveAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-line-soft pt-3">
                        <input type="hidden" name="id" value={objective.id} />
                        <div className="w-[124px]">
                          <Select name="status" defaultValue={objective.status} className="h-8 text-[11px]" aria-label={`Status for ${objective.title}`}>
                            {Object.entries(STATUS_LABEL).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Input
                          name="progressNote"
                          defaultValue={objective.progressNote ?? ""}
                          placeholder="Latest measurement / progress note"
                          className="h-8 min-w-[180px] flex-1 text-[11px]"
                          aria-label={`Progress note for ${objective.title}`}
                        />
                        <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
                          Update
                        </SubmitButton>
                      </form>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <CircleDashed className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No objectives set yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Clause 6.2 requires measurable security objectives. Add a few — each with how it is measured, a target, an
                  owner and a due date.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Add objective</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Make it measurable and assign a name.</p>
            </div>
            <Target className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createObjectiveAction}>
              <Field label="Objective *" htmlFor="title">
                <Input id="title" name="title" placeholder="e.g. Reduce mean time to patch critical vulns to < 7 days" required />
              </Field>
              <Field label="How it is measured" htmlFor="measure">
                <Input
                  id="measure"
                  name="measure"
                  placeholder="e.g. Days from CVE disclosure to patch deployed (from scanner)"
                  required
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target" htmlFor="target">
                  <Input id="target" name="target" placeholder="e.g. < 7 days" />
                </Field>
                <Field label="Owner" htmlFor="owner">
                  <Input id="owner" name="owner" placeholder="e.g. Head of Security" defaultValue={context.user.name} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Due date" htmlFor="dueDate">
                  <Input id="dueDate" name="dueDate" type="date" />
                </Field>
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue="NOT_STARTED">
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Progress note" htmlFor="progressNote" className="mb-0">
                <Textarea id="progressNote" name="progressNote" rows={2} placeholder="Current status / latest measurement" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Adding…" disabled={!writable}>
                  <Plus className="size-3.5" /> Add objective
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
