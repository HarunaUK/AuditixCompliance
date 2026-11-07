import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Plus,
  Search,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RegisterTools } from "@/components/app/register-tools";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { advanceCorrectiveActionAction, createCorrectiveActionAction } from "@/actions/operations";
import {
  actionOverdue,
  correctiveActionSummary,
  listCorrectiveActions,
  listIncidents,
  listSuppliers,
} from "@/lib/services/operations";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import type { ActionPriority, ActionSource, ActionStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Corrective actions" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  VERIFIED: "Verified",
};

const STATUS_TONE: Record<ActionStatus, "red" | "brand" | "amber" | "mint"> = {
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

const SOURCE_LABEL: Record<ActionSource, string> = {
  INCIDENT: "Incident",
  AUDIT: "Internal audit",
  MANAGEMENT_REVIEW: "Management review",
  SUPPLIER: "Supplier review",
  RISK: "Risk treatment",
  OTHER: "Other",
};

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; priority?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const status = ["OPEN", "IN_PROGRESS", "COMPLETED", "VERIFIED"].includes(params.status ?? "")
    ? (params.status as ActionStatus)
    : "ALL";
  const source = ["INCIDENT", "AUDIT", "MANAGEMENT_REVIEW", "SUPPLIER", "RISK", "OTHER"].includes(params.source ?? "")
    ? (params.source as ActionSource)
    : "ALL";
  const priority = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(params.priority ?? "")
    ? (params.priority as ActionPriority)
    : "ALL";

  const [actions, summary, incidents, suppliers, members] = await Promise.all([
    listCorrectiveActions(context.workspace.id, { q: params.q, status, source, priority }),
    correctiveActionSummary(context.workspace.id),
    listIncidents(context.workspace.id),
    listSuppliers(context.workspace.id),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const filtered = Boolean(
    params.q ||
      (params.status && params.status !== "ALL") ||
      (params.source && params.source !== "ALL") ||
      (params.priority && params.priority !== "ALL"),
  );
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);

  return (
    <div>
      <PageHeader
        eyebrow="Operations · Clause 10.1"
        title="Corrective actions"
        description="The fixes raised by incidents, audits and management reviews — who owns each one, when it is due, and how completion was verified rather than assumed."
        actions={
          <>
            <RegisterTools register="actions" />
            <Link href="/incidents" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Incidents
            </Link>
            <Link href="/suppliers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Suppliers
            </Link>
          </>
        }
      />

      {params.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Corrective action updated.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {params.error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Actions", value: summary.total, hint: "All sources", tone: "text-ink" },
          { label: "Open", value: summary.open, hint: "Open or in progress", tone: "text-sky-200" },
          { label: "Overdue", value: summary.overdue, hint: "Past the due date", tone: summary.overdue ? "text-red-300" : "text-emerald-200" },
          { label: "Verified", value: summary.verified, hint: "Effectiveness checked", tone: "text-emerald-200" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={cn("mt-1.5 font-mono text-[21px] leading-none", stat.tone)}>{stat.value}</p>
            <p className="mt-1 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="p-0">
            <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search actions…" className="pl-8" aria-label="Search actions" />
              </div>
              <Select name="status" defaultValue={status} className="w-auto min-w-[120px]" aria-label="Filter by status">
                <option value="ALL">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select name="source" defaultValue={source} className="w-auto min-w-[130px]" aria-label="Filter by source">
                <option value="ALL">All sources</option>
                {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select name="priority" defaultValue={priority} className="w-auto min-w-[120px]" aria-label="Filter by priority">
                <option value="ALL">All priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Filter className="size-3.5" /> Filter
              </button>
              {filtered ? (
                <Link href="/corrective-actions" className="px-1 text-[10.5px] text-faint hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>

            {actions.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Wrench}
                  title={filtered ? "No actions match those filters" : "No corrective actions yet"}
                  description={
                    filtered
                      ? "Try a broader search, or clear the status, source and priority filters."
                      : "Raise an action from an incident, internal audit or supplier review. The register should show the fix, the owner and how it was verified."
                  }
                  action={
                    filtered ? (
                      <Link href="/corrective-actions" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Clear filters
                      </Link>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left">
                  <thead>
                    <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Action</th>
                      <th className="px-3 py-2.5 font-semibold">Source</th>
                      <th className="px-3 py-2.5 font-semibold">Priority</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Owner</th>
                      <th className="px-3 py-2.5 font-semibold">Due</th>
                      <th className="px-4 py-2.5 font-semibold">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {actions.map((action) => {
                      const overdue = actionOverdue(action);
                      const days = daysUntil(action.dueDate);
                      return (
                        <tr key={action.id} className="group transition-colors hover:bg-white/[0.022]">
                          <td className="max-w-[300px] px-4 py-3">
                            <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                              <span className="font-mono text-[9.5px] text-faint">{action.reference}</span>
                              <span className="truncate">{action.title}</span>
                            </span>
                            <span className="mt-0.5 block truncate text-[9.5px] text-faint">
                              {action.incident ? (
                                <Link href={`/incidents/${action.incident.id}`} className="hover:text-sky-200">
                                  {action.incident.reference} · {action.incident.title}
                                </Link>
                              ) : action.supplier ? (
                                <Link href="/suppliers" className="hover:text-sky-200">
                                  Supplier · {action.supplier.name}
                                </Link>
                              ) : (
                                action.description
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[10px] text-muted">{SOURCE_LABEL[action.source]}</td>
                          <td className="px-3 py-3">
                            <Badge tone={PRIORITY_TONE[action.priority]} dot>
                              {action.priority.charAt(0) + action.priority.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone={STATUS_TONE[action.status]} dot>
                              {STATUS_LABEL[action.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-[10.5px] text-muted">{action.owner.name}</td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[10px]",
                                overdue ? "text-red-200" : days !== null && days <= 7 && action.status !== "VERIFIED" ? "text-amber-200" : "text-muted",
                              )}
                            >
                              <CalendarClock className="size-3 text-faint" />
                              {action.dueDate ? formatDate(action.dueDate) : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {writable ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {action.status === "OPEN" ? (
                                  <form action={advanceCorrectiveActionAction}>
                                    <input type="hidden" name="id" value={action.id} />
                                    <input type="hidden" name="action" value="START" />
                                    <SubmitButton variant="ghost" size="sm" pendingText="Starting…">
                                      Start
                                    </SubmitButton>
                                  </form>
                                ) : null}
                                {action.status === "OPEN" || action.status === "IN_PROGRESS" ? (
                                  <form action={advanceCorrectiveActionAction}>
                                    <input type="hidden" name="id" value={action.id} />
                                    <input type="hidden" name="action" value="COMPLETE" />
                                    <SubmitButton variant="secondary" size="sm" pendingText="Completing…">
                                      Complete
                                    </SubmitButton>
                                  </form>
                                ) : null}
                                {action.status === "COMPLETED" ? (
                                  <form action={advanceCorrectiveActionAction} className="flex items-center gap-1.5">
                                    <input type="hidden" name="id" value={action.id} />
                                    <input type="hidden" name="action" value="VERIFY" />
                                    <Input
                                      name="effectivenessNote"
                                      placeholder="How was effectiveness checked?"
                                      className="h-7 w-[190px] text-[10px]"
                                      aria-label={`Effectiveness note for ${action.reference}`}
                                      required
                                    />
                                    <SubmitButton variant="secondary" size="sm" pendingText="Verifying…">
                                      Verify
                                    </SubmitButton>
                                  </form>
                                ) : null}
                                {action.status === "VERIFIED" ? (
                                  <span className="flex items-center gap-1 text-[10px] text-emerald-200">
                                    <ClipboardCheck className="size-3.5" /> Closed loop
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[10px] text-faint">Read-only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Raise corrective action</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Link it to the record that raised it.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createCorrectiveActionAction}>
              <Field label="Action *" htmlFor="title">
                <Input id="title" name="title" placeholder="e.g. Automate leaver deprovisioning" required />
              </Field>
              <Field label="Root cause and fix *" htmlFor="description">
                <Textarea id="description" name="description" rows={3} placeholder="What failed, and what will prevent it recurring." required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source" htmlFor="source">
                  <Select id="source" name="source" defaultValue="AUDIT">
                    {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority" htmlFor="priority">
                  <Select id="priority" name="priority" defaultValue="MEDIUM">
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </Select>
                </Field>
              </div>
              <Field label="Linked incident" htmlFor="incidentId">
                <Select id="incidentId" name="incidentId" defaultValue="">
                  <option value="">No incident</option>
                  {incidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.reference} · {incident.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Linked supplier" htmlFor="supplierId">
                <Select id="supplierId" name="supplierId" defaultValue="">
                  <option value="">No supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Owner" htmlFor="ownerId">
                  <Select id="ownerId" name="ownerId" defaultValue={context.user.id}>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Due" htmlFor="dueDate">
                  <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDue.toISOString().slice(0, 10)} />
                </Field>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-4">
                <Link href={`/incidents?severity=CRITICAL`} className="text-[10px] text-faint hover:text-sky-200">
                  Review incidents
                </Link>
                <SubmitButton variant="primary" pendingText="Raising…" disabled={!writable}>
                  <Plus className="size-3.5" /> Raise action
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-faint">
        Verification is a separate step: completing an action records that the work was done, while verification records the check
        that it actually reduced the risk. Both are stamped with a date and actor.
      </p>
    </div>
  );
}
