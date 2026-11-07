import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock3,
  Plus,
  Siren,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getIncident } from "@/lib/services/operations";
import {
  advanceIncidentAction,
  createCorrectiveActionAction,
  updateIncidentSeverityAction,
} from "@/actions/operations";
import { cn, daysUntil, formatDate, formatDateTime } from "@/lib/utils";
import type { ActionPriority, ActionStatus, IncidentCategory, IncidentSeverity, IncidentStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Incident" };
export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<IncidentSeverity, "red" | "amber" | "brand" | "neutral"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "brand",
  LOW: "neutral",
};

const STATUS_TONE: Record<IncidentStatus, "red" | "amber" | "brand" | "mint" | "neutral"> = {
  OPEN: "red",
  INVESTIGATING: "amber",
  CONTAINED: "brand",
  RESOLVED: "mint",
  CLOSED: "neutral",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  CONTAINED: "Contained",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  PHISHING: "Phishing",
  MALWARE: "Malware",
  UNAUTHORISED_ACCESS: "Unauthorised access",
  DATA_BREACH: "Data breach",
  AVAILABILITY: "Availability",
  LOST_DEVICE: "Lost device",
  POLICY_BREACH: "Policy breach",
  SUPPLIER: "Supplier",
  OTHER: "Other",
};

const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
};

const ACTION_STATUS_TONE: Record<ActionStatus, "red" | "brand" | "amber" | "mint"> = {
  OPEN: "red",
  IN_PROGRESS: "brand",
  COMPLETED: "amber",
  VERIFIED: "mint",
};

const PRIORITY_TONE: Record<ActionPriority, "red" | "amber" | "brand" | "neutral"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "brand",
  LOW: "neutral",
};

const ORDER: IncidentStatus[] = ["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"];

const NEXT: Record<IncidentStatus, { status: IncidentStatus; label: string; hint: string } | null> = {
  OPEN: { status: "INVESTIGATING", label: "Start investigation", hint: "Assign the commander, open the timeline and preserve logs." },
  INVESTIGATING: { status: "CONTAINED", label: "Mark contained", hint: "Access is revoked, hosts are isolated or the exposure is stopped." },
  CONTAINED: { status: "RESOLVED", label: "Mark resolved", hint: "Root cause is removed and normal service is confirmed." },
  RESOLVED: { status: "CLOSED", label: "Close incident", hint: "Actions are tracked and the post-incident review is complete." },
  CLOSED: null,
};

export default async function IncidentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const incident = await getIncident(context.workspace.id, id);
  if (!incident) notFound();

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: context.workspace.id },
    select: { userId: true, user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const next = NEXT[incident.status];
  const currentIndex = ORDER.indexOf(incident.status);
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);

  return (
    <div>
      <PageHeader
        eyebrow={`${incident.reference} · ${CATEGORY_LABEL[incident.category]}`}
        title={incident.title}
        description={`Detected ${formatDate(incident.detectedAt)} · owned by ${incident.owner.name}${incident.supplier ? ` · supplier ${incident.supplier.name}` : ""}`}
        actions={
          <>
            <Link href="/incidents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <ArrowLeft className="size-3.5" /> Register
            </Link>
            <Link href="/corrective-actions" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Corrective actions
            </Link>
          </>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Incident updated and the change written to the audit trail.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>What happened</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">The record as reported, plus what was learned.</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={SEVERITY_TONE[incident.severity]} dot>
                  {incident.severity.charAt(0) + incident.severity.slice(1).toLowerCase()}
                </Badge>
                <Badge tone={STATUS_TONE[incident.status]} dot>
                  {STATUS_LABEL[incident.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">{incident.description}</p>
              {incident.impact ? (
                <div className="rounded-xl border border-line-soft bg-canvas/40 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Impact</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{incident.impact}</p>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line-soft bg-canvas/40 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Root cause</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                    {incident.rootCause ?? "Not recorded yet."}
                  </p>
                </div>
                <div className="rounded-xl border border-line-soft bg-canvas/40 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">Resolution</p>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                    {incident.resolution ?? "Not recorded yet."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Timeline</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Append-only. Every stage change records who made the call.</p>
              </div>
              <Badge tone="outline">{incident.updates.length} entries</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
                {incident.updates.map((update) => (
                  <li key={update.id} className="relative flex gap-3 pl-0">
                    <span
                      className={cn(
                        "relative z-10 mt-1 grid size-4 shrink-0 place-items-center rounded-full border",
                        update.status === "CLOSED" || update.status === "RESOLVED"
                          ? "border-mint/40 bg-mint/15 text-emerald-200"
                          : "border-brand/40 bg-brand/15 text-sky-200",
                      )}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[update.status]}>{STATUS_LABEL[update.status]}</Badge>
                        <span className="text-[10px] text-faint">{formatDateTime(update.createdAt)}</span>
                        <span className="text-[10px] text-faint">· {update.actor?.name ?? update.actorName}</span>
                      </div>
                      {update.note ? (
                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{update.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
                {incident.updates.length === 0 ? <p className="text-[11px] text-faint">No timeline entries yet.</p> : null}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Corrective actions</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Fix the cause, then verify the fix worked.</p>
              </div>
              <Badge tone="outline">{incident.correctiveActions.length} linked</Badge>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {incident.correctiveActions.length ? (
                incident.correctiveActions.map((action) => {
                  const days = daysUntil(action.dueDate);
                  return (
                    <div key={action.id} className="rounded-xl border border-line-soft bg-canvas/30 px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9.5px] text-faint">{action.reference}</span>
                        <Badge tone={ACTION_STATUS_TONE[action.status]} dot>
                          {ACTION_STATUS_LABEL[action.status]}
                        </Badge>
                        <Badge tone={PRIORITY_TONE[action.priority]}>{action.priority.toLowerCase()}</Badge>
                        <span
                          className={cn(
                            "ml-auto flex items-center gap-1 text-[9.5px]",
                            days !== null && days < 0 && action.status !== "VERIFIED" ? "text-red-200" : "text-faint",
                          )}
                        >
                          <CalendarClock className="size-3" />
                          {action.dueDate ? formatDate(action.dueDate) : "No due date"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] font-medium leading-snug text-ink">{action.title}</p>
                      <p className="mt-0.5 text-[10px] text-faint">
                        {action.owner.name}
                        {action.completedAt ? ` · completed ${formatDate(action.completedAt)}` : ""}
                        {action.verifiedAt ? ` · verified ${formatDate(action.verifiedAt)}` : ""}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-[10.5px] text-faint">
                  No corrective actions linked yet. A resolved incident without an action is usually just a contained symptom.
                </p>
              )}

              {writable ? (
                <form action={createCorrectiveActionAction} className="rounded-xl border border-line bg-raised/30 p-3">
                  <input type="hidden" name="incidentId" value={incident.id} />
                  <input type="hidden" name="supplierId" value={incident.supplier?.id ?? ""} />
                  <input type="hidden" name="source" value="INCIDENT" />
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Raise action from this incident</p>
                    <Plus className="size-3.5 text-faint" />
                  </div>
                  <Field label="Action *" htmlFor="action-title">
                    <Input id="action-title" name="title" placeholder="e.g. Roll out phishing-resistant MFA for finance" required />
                  </Field>
                  <Field label="Root cause and fix *" htmlFor="action-description">
                    <Textarea id="action-description" name="description" rows={2} placeholder="What failed, and what will prevent it recurring." required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Priority" htmlFor="action-priority">
                      <Select id="action-priority" name="priority" defaultValue="HIGH">
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </Select>
                    </Field>
                    <Field label="Owner" htmlFor="action-owner">
                      <Select id="action-owner" name="ownerId" defaultValue={incident.owner.id}>
                        {members.map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.user.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Due" htmlFor="action-due">
                      <Input id="action-due" name="dueDate" type="date" defaultValue={defaultDue.toISOString().slice(0, 10)} />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <SubmitButton variant="secondary" size="sm" pendingText="Raising…">
                      <Plus className="size-3.5" /> Add action
                    </SubmitButton>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Incident workflow</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Each stage is recorded with a note.</p>
              </div>
              <Siren className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="pt-0">
              <ol className="space-y-2">
                {ORDER.map((status, index) => {
                  const done = index < currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li key={status} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[9px]",
                          done
                            ? "border-mint/35 bg-mint/10 text-emerald-200"
                            : current
                              ? "border-brand/40 bg-brand/15 text-sky-200"
                              : "border-line bg-raised text-faint",
                        )}
                      >
                        {done ? <CheckCircle2 className="size-3" /> : index + 1}
                      </span>
                      <span className={cn("text-[11px]", current ? "font-medium text-ink" : done ? "text-muted" : "text-faint")}>
                        {STATUS_LABEL[status]}
                      </span>
                      {current ? <Badge tone="brand" className="ml-auto">Current</Badge> : null}
                    </li>
                  );
                })}
              </ol>

              {next ? (
                <form action={advanceIncidentAction} className="mt-4 border-t border-line-soft pt-3">
                  <input type="hidden" name="id" value={incident.id} />
                  <input type="hidden" name="status" value={next.status} />
                  <p className="text-[10px] leading-relaxed text-faint">{next.hint}</p>
                  <Field label="Timeline note *" htmlFor="workflow-note">
                    <Textarea id="workflow-note" name="note" rows={2} placeholder="What changed and why." required />
                  </Field>
                  {next.status === "RESOLVED" || next.status === "CLOSED" ? (
                    <Field label="Resolution" htmlFor="workflow-resolution">
                      <Textarea id="workflow-resolution" name="resolution" rows={2} placeholder="How service was restored and the cause removed." />
                    </Field>
                  ) : null}
                  <div className="flex justify-end">
                    <SubmitButton variant="primary" size="sm" pendingText="Recording…" disabled={!writable}>
                      {next.label}
                    </SubmitButton>
                  </div>
                </form>
              ) : (
                <p className="mt-4 flex items-start gap-2 border-t border-line-soft pt-3 text-[10.5px] leading-relaxed text-emerald-200/80">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> Incident closed. Keep the actions and review evidence with
                  the record.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incident details</CardTitle>
              <Badge tone="outline">{incident.reference}</Badge>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0 text-[10.5px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Owner</span>
                <span className="flex items-center gap-1.5 text-muted">
                  <UserRound className="size-3" /> {incident.owner.name}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Category</span>
                <span className="text-muted">{CATEGORY_LABEL[incident.category]}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Detected</span>
                <span className="flex items-center gap-1.5 text-muted">
                  <Clock3 className="size-3" /> {formatDate(incident.detectedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Contained</span>
                <span className="text-muted">{incident.containedAt ? formatDate(incident.containedAt) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Resolved</span>
                <span className="text-muted">{incident.resolvedAt ? formatDate(incident.resolvedAt) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-faint">Reported by</span>
                <span className="text-muted">{incident.reportedBy ?? "—"}</span>
              </div>
              {incident.supplier ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-faint">Supplier</span>
                  <Link href="/suppliers" className="text-sky-200 hover:underline">
                    {incident.supplier.name}
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {writable && incident.status !== "CLOSED" ? (
            <Card>
              <CardHeader>
                <CardTitle>Re-classify severity</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <form action={updateIncidentSeverityAction} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={incident.id} />
                  <div className="flex-1">
                    <Select name="severity" defaultValue={incident.severity} className="h-8 text-[11px]" aria-label="Incident severity">
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </Select>
                  </div>
                  <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
                    Update
                  </SubmitButton>
                </form>
                <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-faint">
                  <CircleAlert className="mt-0.5 size-3 shrink-0" />
                  Severity changes are written to the timeline with your name.
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl border border-line bg-panel px-3 py-2.5 text-[10px] leading-relaxed text-faint">
            <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-brand" />
            The register is append-only. Incidents are closed, not deleted, so the audit trail remains complete.
          </div>
        </div>
      </div>
    </div>
  );
}
