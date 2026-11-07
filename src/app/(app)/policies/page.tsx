import Link from "next/link";
import type { Metadata } from "next";
import { BookLock, CalendarClock, ChevronRight, FilePlus2, Filter, Layers3, Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PolicyBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { GeneratePolicyDialog } from "@/components/policies/generate-policy-dialog";
import { RegisterTools } from "@/components/app/register-tools";
import { getWorkspaceContext } from "@/lib/workspace";
import { aiConfigured } from "@/lib/ai";
import { listPolicies, policyCounts } from "@/lib/services/policies";
import { controlMeta } from "@/lib/services/controls";
import { cn, daysUntil, formatDate } from "@/lib/utils";
import type { PolicyStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Policies" };
export const dynamic = "force-dynamic";

const STATUSES: { value: PolicyStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "APPROVED", label: "Approved" },
  { value: "RETIRED", label: "Retired" },
];

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; framework?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const { workspace } = await getWorkspaceContext();
  const status = STATUSES.some((item) => item.value === params.status) ? (params.status as PolicyStatus | "ALL") : "ALL";

  const [policies, counts, meta] = await Promise.all([
    listPolicies(workspace.id, { q: params.q, status, framework: params.framework }),
    policyCounts(workspace.id),
    controlMeta(workspace.id),
  ]);

  const filtered = Boolean(params.q || (params.status && params.status !== "ALL") || params.framework);

  return (
    <div>
      <PageHeader
        eyebrow="Compliance library"
        title="Policies"
        description="Draft, review and version the written standards behind your certification. Every approved revision keeps its full audit history."
        actions={
          <>
            <RegisterTools register="policies" importKind="policies" />
            <GeneratePolicyDialog enabled={aiConfigured()} />
            <Link href="/policies/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <FilePlus2 className="size-3.5" /> New policy
            </Link>
          </>
        }
      />

      {params.deleted ? (
        <div className="mb-4 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          Policy deleted. Its versions and evidence links were removed with it.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total policies", value: counts.ALL, icon: BookLock, className: "text-sky-300 border-brand/25 bg-brand/10" },
          { label: "Approved", value: counts.APPROVED, icon: ShieldCheck, className: "text-emerald-300 border-mint/25 bg-mint/10" },
          { label: "In review", value: counts.IN_REVIEW, icon: Layers3, className: "text-amber-300 border-warning/25 bg-warning/10" },
          { label: "Drafts", value: counts.DRAFT, icon: FilePlus2, className: "text-indigo-300 border-violet/25 bg-violet/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
              <span className={cn("grid size-6 place-items-center rounded-md border", stat.className)}>
                <stat.icon className="size-3" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[21px] leading-none text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <Input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search by title, category or summary…"
                className="pl-8"
                aria-label="Search policies"
              />
            </div>
            <Select name="status" defaultValue={status} className="w-auto min-w-[132px]" aria-label="Filter by status">
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Select name="framework" defaultValue={params.framework ?? ""} className="w-auto min-w-[160px]" aria-label="Filter by framework">
              <option value="">All frameworks</option>
              {meta.frameworks.map((framework) => (
                <option key={framework.key} value={framework.key}>
                  {framework.name}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Filter className="size-3.5" /> Filter
            </button>
            {filtered ? (
              <Link href="/policies" className="px-1 text-[10.5px] text-faint hover:text-ink">
                Clear
              </Link>
            ) : null}
            <span className="ml-auto hidden text-[10.5px] text-faint sm:block">
              {policies.length} result{policies.length === 1 ? "" : "s"}
            </span>
          </form>

          {policies.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={BookLock}
                title={filtered ? "No policies match those filters" : "No policies yet"}
                description={
                  filtered
                    ? "Try a broader search, or clear the status and framework filters."
                    : "Start with an information security policy, then map it to the controls it satisfies."
                }
                action={
                  filtered ? (
                    <Link href="/policies" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Clear filters
                    </Link>
                  ) : (
                    <Link href="/policies/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
                      <FilePlus2 className="size-3.5" /> Create the first policy
                    </Link>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                    <th className="px-4 py-2.5 font-semibold">Policy</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Framework mapping</th>
                    <th className="px-3 py-2.5 font-semibold">Owner</th>
                    <th className="px-3 py-2.5 font-semibold">Next review</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {policies.map((policy) => {
                    const days = daysUntil(policy.reviewDueAt);
                    const frameworkKeys = Array.from(new Set(policy.controls.map((row) => row.control.framework.name)));
                    return (
                      <tr key={policy.id} className="group transition-colors hover:bg-white/[0.022]">
                        <td className="px-4 py-3">
                          <Link href={`/policies/${policy.id}`} className="block min-w-0">
                            <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink group-hover:text-sky-100">
                              {policy.title}
                              <ChevronRight className="size-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-faint">
                              <span className="rounded border border-line bg-raised px-1 font-mono text-[9px]">v{policy.version}</span>
                              {policy.category}
                              <span>·</span>
                              {policy._count.versions} version{policy._count.versions === 1 ? "" : "s"}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <PolicyBadge status={policy.status} />
                        </td>
                        <td className="px-3 py-3">
                          {policy.controls.length ? (
                            <div>
                              <div className="flex flex-wrap gap-1">
                                {policy.controls.slice(0, 3).map((row) => (
                                  <span
                                    key={row.control.id}
                                    className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted"
                                    title={row.control.title}
                                  >
                                    {row.control.ref}
                                  </span>
                                ))}
                                {policy.controls.length > 3 ? (
                                  <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-faint">
                                    +{policy.controls.length - 3}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-[9.5px] text-faint">{frameworkKeys.join(" · ") || "—"}</p>
                            </div>
                          ) : (
                            <span className="text-[10.5px] text-faint">Not mapped</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted">{policy.owner.name}</td>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-1.5 text-[10.5px]">
                            <CalendarClock
                              className={cn(
                                "size-3",
                                days === null ? "text-faint" : days < 0 ? "text-danger" : days <= 14 ? "text-warning" : "text-faint",
                              )}
                            />
                            <span className={cn(days !== null && days < 0 ? "text-red-200" : "text-muted")}>
                              {policy.reviewDueAt ? formatDate(policy.reviewDueAt) : "Not set"}
                            </span>
                          </span>
                          {days !== null ? (
                            <span className="mt-0.5 block text-[9px] text-faint">
                              {days < 0 ? `${Math.abs(days)} days overdue` : `in ${days} days`}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/policies/${policy.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                            Open
                          </Link>
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

      <p className="mt-3 text-[10.5px] text-faint">
        {counts.ALL} polic{counts.ALL === 1 ? "y" : "ies"} in {workspace.name}. Drafts are visible to every member of this workspace.
      </p>
    </div>
  );
}
