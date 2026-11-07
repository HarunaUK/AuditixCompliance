import type { Metadata } from "next";
import { CalendarCheck, CheckCircle2, ClipboardList, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  completeInternalAuditAction,
  createInternalAuditAction,
  deleteInternalAuditAction,
} from "@/actions/isms";
import { cn, formatDate } from "@/lib/utils";
import type { AuditStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Internal audits" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<AuditStatus, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
};

export default async function InternalAuditsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const audits = await db.internalAudit.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { auditDate: "desc" },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        eyebrow="Assurance · Clause 9.2"
        title="Internal audits"
        description="The planned audit programme, the scope of each review, the findings and the date it was completed. An auditor samples this to test whether the ISMS is checking itself, not just waiting for an external visit."
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Internal audit updated.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Internal audit removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Audits", value: audits.length, tone: "text-ink" },
          { label: "Planned", value: audits.filter((audit) => audit.status === "PLANNED").length, tone: "text-sky-200" },
          { label: "Completed", value: audits.filter((audit) => audit.status === "COMPLETED").length, tone: "text-emerald-200" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={cn("mt-1.5 font-mono text-[23px] leading-none", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {audits.length ? (
            audits.map((audit) => (
              <Card key={audit.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={audit.status === "COMPLETED" ? "mint" : "brand"} dot>
                          {STATUS_LABEL[audit.status]}
                        </Badge>
                        <span className="flex items-center gap-1 text-[10px] text-faint">
                          <CalendarCheck className="size-3" /> {formatDate(audit.auditDate)}
                        </span>
                        {audit.completedAt ? (
                          <span className="text-[10px] text-faint">Completed {formatDate(audit.completedAt)}</span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-[13px] font-semibold leading-snug text-ink">{audit.title}</h2>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{audit.scope}</p>
                      {audit.findings ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2 text-[10px] leading-relaxed text-muted">
                          <span className="font-medium text-faint">Findings: </span>
                          {audit.findings}
                        </p>
                      ) : null}
                    </div>
                    {writable ? (
                      <div className="flex items-center gap-1">
                        {audit.status !== "COMPLETED" ? (
                          <form action={completeInternalAuditAction}>
                            <input type="hidden" name="id" value={audit.id} />
                            <SubmitButton variant="secondary" size="sm" pendingText="Completing…">
                              Mark complete
                            </SubmitButton>
                          </form>
                        ) : null}
                        <form action={deleteInternalAuditAction}>
                          <input type="hidden" name="id" value={audit.id} />
                          <DangerSubmit
                            variant="ghost"
                            size="icon"
                            className="size-7 text-faint hover:text-red-300"
                            message={`Remove the internal audit “${audit.title}”?`}
                            aria-label="Remove internal audit"
                          >
                            <Trash2 className="size-3.5" />
                          </DangerSubmit>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <ClipboardList className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No internal audits scheduled</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Schedule your first internal audit to satisfy ISO 27001 Clause 9.2 — auditors expect a planned programme.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Schedule audit</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Plan it or record one already held.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createInternalAuditAction}>
              <Field label="Title *" htmlFor="title">
                <Input id="title" name="title" placeholder="e.g. Annex A access-control audit" required />
              </Field>
              <Field label="Audit date" htmlFor="auditDate">
                <Input id="auditDate" name="auditDate" type="date" defaultValue={today} required />
              </Field>
              <Field label="Scope" htmlFor="scope">
                <Textarea id="scope" name="scope" rows={3} placeholder="Controls / departments in scope" required />
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue="PLANNED">
                  <option value="PLANNED">Planned</option>
                  <option value="COMPLETED">Completed</option>
                </Select>
              </Field>
              <Field label="Findings" htmlFor="findings" className="mb-0" hint="Optional until the audit is complete.">
                <Textarea id="findings" name="findings" rows={2} placeholder="Observations, nonconformities, actions" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Saving…" disabled={!writable}>
                  <Plus className="size-3.5" /> Save audit
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
