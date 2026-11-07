import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Filter,
  Plus,
  Search,
  Siren,
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
import { reportIncidentAction } from "@/actions/operations";
import { incidentSummary, listIncidents, listSuppliers } from "@/lib/services/operations";
import { INCIDENT_CATEGORIES } from "@/lib/validation";
import { cn, formatDate } from "@/lib/utils";
import type { IncidentCategory, IncidentSeverity, IncidentStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Incident register" };
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

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; severity?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const status = ["OPEN", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"].includes(params.status ?? "")
    ? (params.status as IncidentStatus)
    : "ALL";
  const severity = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(params.severity ?? "")
    ? (params.severity as IncidentSeverity)
    : "ALL";

  const [incidents, summary, suppliers, members] = await Promise.all([
    listIncidents(context.workspace.id, { q: params.q, status, severity }),
    incidentSummary(context.workspace.id),
    listSuppliers(context.workspace.id),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const filtered = Boolean(params.q || (params.status && params.status !== "ALL") || (params.severity && params.severity !== "ALL"));
  const today = new Date().toISOString().slice(0, 10);
  const liveSuppliers = suppliers.filter((supplier) => supplier.status !== "EXITED");

  return (
    <div>
      <PageHeader
        eyebrow="Operations · Clause 5.24"
        title="Incident register"
        description="Every security event that became an incident, its severity, who owns it, how it was contained and what changed afterwards. The timeline is the evidence, not the summary."
        actions={
          <>
            <RegisterTools register="incidents" />
            <Link href="/corrective-actions" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Corrective actions
            </Link>
            <Link href="/suppliers" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Suppliers
            </Link>
          </>
        }
      />

      {params.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Incident updated.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {params.error}
        </div>
      ) : null}

      {summary.critical > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {summary.critical} open critical incident{summary.critical === 1 ? "" : "s"}. Escalate to the incident commander and
          start the communications clock.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Incidents", value: summary.total, hint: "All time", tone: "text-ink" },
          { label: "Open", value: summary.open, hint: "Open to contained", tone: summary.open ? "text-sky-200" : "text-ink" },
          { label: "Critical / high open", value: summary.critical + summary.high, hint: "Needs command", tone: summary.critical + summary.high ? "text-red-300" : "text-emerald-200" },
          { label: "Resolved 30d", value: summary.resolved30, hint: "Closed loop", tone: "text-emerald-200" },
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
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search incidents…" className="pl-8" aria-label="Search incidents" />
              </div>
              <Select name="severity" defaultValue={severity} className="w-auto min-w-[124px]" aria-label="Filter by severity">
                <option value="ALL">All severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
              <Select name="status" defaultValue={status} className="w-auto min-w-[124px]" aria-label="Filter by status">
                <option value="ALL">All statuses</option>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Filter className="size-3.5" /> Filter
              </button>
              {filtered ? (
                <Link href="/incidents" className="px-1 text-[10.5px] text-faint hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>

            {incidents.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Siren}
                  title={filtered ? "No incidents match those filters" : "No incidents recorded"}
                  description={
                    filtered
                      ? "Try a broader search, or clear the severity and status filters."
                      : "Record the first incident when it happens — even a near miss or a tabletop exercise. An empty register is not evidence of zero incidents."
                  }
                  action={
                    filtered ? (
                      <Link href="/incidents" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Clear filters
                      </Link>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Incident</th>
                      <th className="px-3 py-2.5 font-semibold">Severity</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Owner</th>
                      <th className="px-3 py-2.5 font-semibold">Detected</th>
                      <th className="px-3 py-2.5 font-semibold">Actions</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="group transition-colors hover:bg-white/[0.022]">
                        <td className="max-w-[320px] px-4 py-3">
                          <Link href={`/incidents/${incident.id}`} className="block min-w-0">
                            <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-ink group-hover:text-sky-100">
                              <span className="font-mono text-[9.5px] text-faint">{incident.reference}</span>
                              {incident.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[9.5px] text-faint">
                              {CATEGORY_LABEL[incident.category]}
                              {incident.supplier ? ` · ${incident.supplier.name}` : ""}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={SEVERITY_TONE[incident.severity]} dot>
                            {incident.severity.charAt(0) + incident.severity.slice(1).toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={STATUS_TONE[incident.status]} dot>
                            {STATUS_LABEL[incident.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-[10.5px] text-muted">{incident.owner.name}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1 text-[10px] text-muted">
                            <CalendarClock className="size-3 text-faint" />
                            {formatDate(incident.detectedAt)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[10px] text-muted">
                          {incident._count.correctiveActions} action{incident._count.correctiveActions === 1 ? "" : "s"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/incidents/${incident.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                            Open <ArrowUpRight className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Report incident</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Create the record now, refine it later.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={reportIncidentAction}>
              <Field label="Title *" htmlFor="title">
                <Input id="title" name="title" placeholder="e.g. Phishing email reported by finance" required />
              </Field>
              <Field label="What happened *" htmlFor="description">
                <Textarea id="description" name="description" rows={3} placeholder="What was detected, where, and what is affected." required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="category">
                  <Select id="category" name="category" defaultValue="PHISHING">
                    {INCIDENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_LABEL[category]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Severity" htmlFor="severity">
                  <Select id="severity" name="severity" defaultValue="MEDIUM">
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Detected *" htmlFor="detectedAt">
                  <Input id="detectedAt" name="detectedAt" type="date" defaultValue={today} required />
                </Field>
                <Field label="Reported by" htmlFor="reportedBy">
                  <Input id="reportedBy" name="reportedBy" defaultValue={context.user.name} />
                </Field>
              </div>
              <Field label="Owner" htmlFor="ownerId">
                <Select id="ownerId" name="ownerId" defaultValue={context.user.id}>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Supplier (if involved)" htmlFor="supplierId">
                <Select id="supplierId" name="supplierId" defaultValue="">
                  <option value="">No supplier</option>
                  {liveSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Initial impact" htmlFor="impact" className="mb-0" hint="Known or suspected business impact.">
                <Textarea id="impact" name="impact" rows={2} placeholder="Systems, data or customers affected" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Reporting…" disabled={!writable}>
                  <Plus className="size-3.5" /> Report incident
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
