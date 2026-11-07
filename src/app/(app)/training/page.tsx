import type { Metadata } from "next";
import { CheckCircle2, GraduationCap, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RegisterTools } from "@/components/app/register-tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { completeTrainingAction, createTrainingRecordAction, deleteTrainingRecordAction } from "@/actions/isms";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Security awareness training" };
export const dynamic = "force-dynamic";

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const records = await db.trainingRecord.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const completed = records.filter((record) => record.status === "COMPLETED").length;
  const assigned = records.filter((record) => record.status === "ASSIGNED").length;

  return (
    <div>
      <PageHeader
        eyebrow="People · A.6.3 / Clauses 7.2–7.3"
        title="Security awareness training"
        description="Who was assigned which course, when it was completed and when it is next due. A completion record is the evidence; an induction slide deck is not."
        actions={<RegisterTools register="training" />}
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Training record updated.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Training record removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Records", value: records.length, tone: "text-ink" },
          { label: "Assigned", value: assigned, tone: "text-sky-200" },
          { label: "Completed", value: completed, tone: "text-emerald-200" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={cn("mt-1.5 font-mono text-[23px] leading-none", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Training register</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Assign a course, then mark it complete when the record exists.</p>
            </div>
            <Badge tone={completed > 0 ? "mint" : "neutral"}>{completed} completed</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {records.length ? (
              <div className="divide-y divide-line-soft">
                {records.map((record) => {
                  const days = daysUntil(record.dueDate);
                  return (
                    <div key={record.id} className="group flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border",
                          record.status === "COMPLETED"
                            ? "border-mint/25 bg-mint/10 text-emerald-300"
                            : "border-line bg-raised text-faint",
                        )}
                      >
                        <GraduationCap className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12px] font-medium text-ink">{record.course}</p>
                          <Badge tone={record.status === "COMPLETED" ? "mint" : "brand"} dot>
                            {record.status === "COMPLETED" ? "Completed" : "Assigned"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10.5px] text-faint">{record.assignee}</p>
                        <p className="mt-1 text-[10px] text-faint">
                          {record.completedAt
                            ? `Completed ${formatDate(record.completedAt)}`
                            : record.dueDate
                              ? `Due ${formatDate(record.dueDate)}${days !== null && days < 0 ? ` · ${Math.abs(days)}d overdue` : ""}`
                              : "No due date"}
                        </p>
                      </div>
                      {writable ? (
                        <div className="flex items-center gap-1">
                          {record.status !== "COMPLETED" ? (
                            <form action={completeTrainingAction}>
                              <input type="hidden" name="id" value={record.id} />
                              <SubmitButton variant="secondary" size="sm" pendingText="Marking…">
                                Mark complete
                              </SubmitButton>
                            </form>
                          ) : null}
                          <form action={deleteTrainingRecordAction}>
                            <input type="hidden" name="id" value={record.id} />
                            <DangerSubmit
                              variant="ghost"
                              size="icon"
                              className="size-7 text-faint hover:text-red-300"
                              message={`Remove the training record for ${record.assignee}?`}
                              aria-label="Remove training record"
                            >
                              <Trash2 className="size-3.5" />
                            </DangerSubmit>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-14 text-center">
                <GraduationCap className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No training records yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Assign the awareness course to your team, then mark each record complete when it is delivered. At least one
                  completed record clears the Stage 1 training prerequisite.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Assign training</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">One person and one course per record.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createTrainingRecordAction}>
              <Field label="Course" htmlFor="course">
                <Input id="course" name="course" placeholder="e.g. Security awareness essentials" required />
              </Field>
              <Field label="Assignee" htmlFor="assignee">
                <Input id="assignee" name="assignee" placeholder="Full name or team" required />
              </Field>
              <Field label="Due date" htmlFor="dueDate" className="mb-0">
                <Input id="dueDate" name="dueDate" type="date" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Assigning…" disabled={!writable}>
                  <Plus className="size-3.5" /> Assign
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
