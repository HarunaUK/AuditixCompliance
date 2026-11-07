import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  CircleAlert,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Truck,
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
import { createSupplierAction, reviewSupplierAction } from "@/actions/operations";
import { listSuppliers, supplierSummary } from "@/lib/services/operations";
import { SUPPLIER_CATEGORIES } from "@/lib/validation";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import type { SupplierCriticality, SupplierStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Supplier register" };
export const dynamic = "force-dynamic";

const CRITICALITY_TONE: Record<SupplierCriticality, "red" | "amber" | "brand" | "neutral"> = {
  CRITICAL: "red",
  HIGH: "amber",
  MEDIUM: "brand",
  LOW: "neutral",
};

const STATUS_TONE: Record<SupplierStatus, "mint" | "amber" | "red" | "outline"> = {
  ACTIVE: "mint",
  UNDER_REVIEW: "amber",
  SUSPENDED: "red",
  EXITED: "outline",
};

const STATUS_LABEL: Record<SupplierStatus, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under review",
  SUSPENDED: "Suspended",
  EXITED: "Exited",
};

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; criticality?: string; status?: string; saved?: string; reviewed?: string; error?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const criticality = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(params.criticality ?? "")
    ? (params.criticality as SupplierCriticality)
    : "ALL";
  const status = ["ACTIVE", "UNDER_REVIEW", "SUSPENDED", "EXITED"].includes(params.status ?? "")
    ? (params.status as SupplierStatus)
    : "ALL";

  const [suppliers, summary, members] = await Promise.all([
    listSuppliers(context.workspace.id, { q: params.q, criticality, status }),
    supplierSummary(context.workspace.id),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const filtered = Boolean(params.q || (params.criticality && params.criticality !== "ALL") || (params.status && params.status !== "ALL"));
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  return (
    <div>
      <PageHeader
        eyebrow="Operations · Clause 5.19"
        title="Supplier register"
        description="The third parties that touch your data or keep the service running, with owners, due-diligence reviews, DPA status and the assurance they can evidence."
        actions={
          <>
            <RegisterTools register="suppliers" />
            <Link href="/incidents" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Incident register
            </Link>
            <Link href="/corrective-actions" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Corrective actions
            </Link>
          </>
        }
      />

      {params.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Supplier added to the register.
        </div>
      ) : null}
      {params.reviewed ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Supplier review recorded and the next date scheduled.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {params.error}
        </div>
      ) : null}

      {summary.dpaGaps > 0 ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/[0.05] px-3.5 py-2.5 text-[11.5px] text-amber-200">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {summary.dpaGaps} supplier{summary.dpaGaps === 1 ? "" : "s"} access data without a recorded DPA. That is an audit finding
          waiting to happen.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Suppliers", value: summary.total, hint: `${summary.active} active`, tone: "text-ink" },
          { label: "Critical / high", value: summary.critical + summary.high, hint: "In-scope suppliers", tone: "text-amber-200" },
          { label: "Reviews due", value: summary.reviewsDue, hint: "Next 30 days", tone: summary.reviewsDue ? "text-amber-200" : "text-ink" },
          { label: "DPA gaps", value: summary.dpaGaps, hint: `${summary.dataProcessors} process data`, tone: summary.dpaGaps ? "text-red-300" : "text-emerald-200" },
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
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search suppliers…" className="pl-8" aria-label="Search suppliers" />
              </div>
              <Select name="criticality" defaultValue={criticality} className="w-auto min-w-[130px]" aria-label="Filter by criticality">
                <option value="ALL">All criticality</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
              <Select name="status" defaultValue={status} className="w-auto min-w-[130px]" aria-label="Filter by status">
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXITED">Exited</option>
              </Select>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Filter className="size-3.5" /> Filter
              </button>
              {filtered ? (
                <Link href="/suppliers" className="px-1 text-[10.5px] text-faint hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>

            {suppliers.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Truck}
                  title={filtered ? "No suppliers match those filters" : "The supplier register is empty"}
                  description={
                    filtered
                      ? "Try a broader search, or clear the criticality and status filters."
                      : "Start with the providers that host data or keep your service available — those are the ones an auditor samples first."
                  }
                  action={
                    filtered ? (
                      <Link href="/suppliers" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Clear filters
                      </Link>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left">
                  <thead>
                    <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Supplier</th>
                      <th className="px-3 py-2.5 font-semibold">Criticality</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Owner</th>
                      <th className="px-3 py-2.5 font-semibold">Next review</th>
                      <th className="px-3 py-2.5 font-semibold">DPA</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {suppliers.map((supplier) => {
                      const days = daysUntil(supplier.nextReviewAt);
                      return (
                        <tr key={supplier.id} className="group transition-colors hover:bg-white/[0.022]">
                          <td className="max-w-[300px] px-4 py-3">
                            <span className="flex items-center gap-1.5 truncate text-[12px] font-medium text-ink">
                              {supplier.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[9.5px] text-faint">
                              {supplier.service} · {supplier.category}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone={CRITICALITY_TONE[supplier.criticality]} dot>
                              {supplier.criticality.charAt(0) + supplier.criticality.slice(1).toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone={STATUS_TONE[supplier.status]} dot>
                              {STATUS_LABEL[supplier.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-[10.5px] text-muted">{supplier.owner.name}</td>
                          <td className="px-3 py-3">
                            {supplier.nextReviewAt ? (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  days !== null && days < 0 ? "text-red-200" : days !== null && days <= 30 ? "text-amber-200" : "text-muted",
                                )}
                              >
                                <CalendarCheck className="size-3 text-faint" />
                                {formatDate(supplier.nextReviewAt)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-red-300">Not scheduled</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {supplier.dataAccess ? (
                              supplier.dpaSigned ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-200">
                                  <ShieldCheck className="size-3" /> Signed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-red-200">
                                  <CircleAlert className="size-3" /> Missing
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] text-faint">No data</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {writable && supplier.status !== "EXITED" ? (
                              <form action={reviewSupplierAction}>
                                <input type="hidden" name="id" value={supplier.id} />
                                <SubmitButton variant="ghost" size="sm" pendingText="Recording…">
                                  Review now
                                </SubmitButton>
                              </form>
                            ) : (
                              <span className="text-[10px] text-faint">
                                {supplier._count.incidents} incident{supplier._count.incidents === 1 ? "" : "s"}
                              </span>
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
              <CardTitle>Add supplier</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Criticality sets the review cadence.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createSupplierAction}>
              <Field label="Supplier name *" htmlFor="name">
                <Input id="name" name="name" placeholder="e.g. Amazon Web Services" required />
              </Field>
              <Field label="What they provide *" htmlFor="service">
                <Input id="service" name="service" placeholder="e.g. Production cloud hosting" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="category">
                  <Select id="category" name="category" defaultValue="Cloud infrastructure">
                    {SUPPLIER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Criticality" htmlFor="criticality">
                  <Select id="criticality" name="criticality" defaultValue="HIGH">
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue="ACTIVE">
                    <option value="ACTIVE">Active</option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="EXITED">Exited</option>
                  </Select>
                </Field>
                <Field label="Owner" htmlFor="ownerId">
                  <Select id="ownerId" name="ownerId" defaultValue={context.user.id}>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.user.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Assurance held" htmlFor="assurance" hint="ISO 27001, SOC 2 Type II, Cyber Essentials, etc.">
                <Input id="assurance" name="assurance" placeholder="e.g. ISO/IEC 27001, SOC 2 Type II" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Last reviewed" htmlFor="lastReviewedAt">
                  <Input id="lastReviewedAt" name="lastReviewedAt" type="date" />
                </Field>
                <Field label="Next review *" htmlFor="nextReviewAt">
                  <Input
                    id="nextReviewAt"
                    name="nextReviewAt"
                    type="date"
                    defaultValue={nextYear.toISOString().slice(0, 10)}
                    required
                  />
                </Field>
              </div>
              <div className="mb-4 space-y-2 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5">
                <label className="flex cursor-pointer items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                  <input type="checkbox" name="dataAccess" className="mt-0.5 size-3.5 rounded border-line bg-canvas accent-sky-400" />
                  <span>This supplier processes or stores our data</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[10.5px] leading-relaxed text-muted">
                  <input type="checkbox" name="dpaSigned" className="mt-0.5 size-3.5 rounded border-line bg-canvas accent-sky-400" />
                  <span>A data processing agreement is signed</span>
                </label>
              </div>
              <Field label="Notes" htmlFor="notes" className="mb-0">
                <Textarea id="notes" name="notes" rows={2} placeholder="Key contacts, contract terms, exit considerations" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Adding…" disabled={!writable}>
                  <Plus className="size-3.5" /> Add supplier
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
