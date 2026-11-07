import type { Metadata } from "next";
import { CalendarCheck, CheckCircle2, Plus, Trash2, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createManagementReviewAction, deleteManagementReviewAction } from "@/actions/isms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Management reviews" };
export const dynamic = "force-dynamic";

export default async function ManagementReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const reviews = await db.managementReview.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { reviewDate: "desc" },
  });
  const mostRecent = reviews[0];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        eyebrow="Leadership · Clause 9.3"
        title="Management reviews"
        description="The record that top management reviewed the ISMS: who attended, what was decided and which actions came out. Clause 9.3 evidence is a minute, not a calendar entry."
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Management review logged.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Review record removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Reviews logged", value: reviews.length },
          { label: "Most recent", value: mostRecent ? formatDate(mostRecent.reviewDate) : "—" },
          { label: "Attendees at last review", value: mostRecent ? mostRecent.attendees.split(",").filter(Boolean).length : 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className="mt-1.5 font-mono text-[20px] leading-none text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {reviews.length ? (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="violet" dot>
                          <CalendarCheck className="size-2.5" /> {formatDate(review.reviewDate)}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-faint">
                          <UsersRound className="size-3" /> {review.attendees}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">{review.decisions}</p>
                    </div>
                    {writable ? (
                      <form action={deleteManagementReviewAction}>
                        <input type="hidden" name="id" value={review.id} />
                        <DangerSubmit
                          variant="ghost"
                          size="icon"
                          className="size-7 text-faint hover:text-red-300"
                          message={`Remove the management review from ${formatDate(review.reviewDate)}?`}
                          aria-label="Remove management review"
                        >
                          <Trash2 className="size-3.5" />
                        </DangerSubmit>
                      </form>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <CalendarCheck className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No management reviews logged</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Top management must review the ISMS at planned intervals. Log the date, attendees and decisions — the Stage 1
                  gate checks for a review in the last year.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Log review</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Minutes are the evidence.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createManagementReviewAction}>
              <Field label="Date" htmlFor="reviewDate">
                <Input id="reviewDate" name="reviewDate" type="date" defaultValue={today} required />
              </Field>
              <Field label="Attendees (comma-separated)" htmlFor="attendees">
                <Input id="attendees" name="attendees" placeholder="Jane Doe, CISO, John Smith" required />
              </Field>
              <Field label="Decisions / summary" htmlFor="decisions" className="mb-0">
                <Textarea
                  id="decisions"
                  name="decisions"
                  rows={7}
                  placeholder={
                    "Status of actions from the previous review\nChanges in context, risk and performance\nAudit and incident results\nDecisions on treatment, resourcing and improvement"
                  }
                  required
                />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Saving…" disabled={!writable}>
                  <Plus className="size-3.5" /> Save review
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
