import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  ArrowRight,
  ArrowUpRight,
  BookLock,
  Building2,
  CheckCircle2,
  FolderLock,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { CreateWorkspaceForm } from "@/components/workspaces/create-workspace-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { requireUser } from "@/lib/auth";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import { listWorkspaces } from "@/lib/services/workspaces";
import { createWorkspaceAction, switchWorkspaceAction } from "@/actions/workspace";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Workspaces" };
export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const user = await requireUser();
  const [memberships, store] = await Promise.all([listWorkspaces(user.id), cookies()]);
  const requested = store.get(WORKSPACE_COOKIE)?.value;
  const activeId = memberships.find((item) => item.workspace.id === requested)?.workspace.id ?? memberships[0]?.workspace.id;

  const totals = memberships.reduce(
    (sum, item) => ({
      policies: sum.policies + item.workspace._count.policies,
      risks: sum.risks + item.workspace._count.risks,
      evidence: sum.evidence + item.workspace._count.evidence,
    }),
    { policies: 0, risks: 0, evidence: 0 },
  );

  return (
    <div>
      <PageHeader
        eyebrow="Multi-client portfolio"
        title="Clients & workspaces"
        description="Every workspace is an isolated tenant with its own team, frameworks, policies, risks and evidence. Switch without mixing data."
        actions={
          memberships.length ? (
            <Link href="/dashboard" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Open active workspace <ArrowRight className="size-3.5" />
            </Link>
          ) : null
        }
      />

      {memberships.length ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Workspaces", value: memberships.length, icon: Building2 },
            { label: "Total policies", value: totals.policies, icon: BookLock },
            { label: "Total risks", value: totals.risks, icon: ShieldCheck },
            { label: "Evidence items", value: totals.evidence, icon: FolderLock },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
                <stat.icon className="size-3.5 text-faint" />
              </div>
              <p className="mt-1.5 font-mono text-[21px] leading-none text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {memberships.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {memberships.map((membership) => {
                const workspace = membership.workspace;
                const active = workspace.id === activeId;
                const plan = PLANS[workspace.plan];
                return (
                  <div
                    key={membership.id}
                    className={cn(
                      "relative flex flex-col rounded-2xl border p-4 ring-sheen",
                      active ? "border-brand/40 bg-[linear-gradient(145deg,rgba(56,189,248,0.06),rgba(11,19,43,0)_50%)]" : "border-line bg-panel",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("grid size-9 place-items-center rounded-xl border", active ? "border-brand/30 bg-brand/10 text-brand" : "border-line bg-raised text-muted")}>
                        <Building2 className="size-4" />
                      </span>
                      <div className="flex items-center gap-1.5">
                        {active ? (
                          <Badge tone="brand" dot>
                            Active
                          </Badge>
                        ) : null}
                        <Badge tone="outline">{plan.name}</Badge>
                      </div>
                    </div>
                    <h2 className="mt-3 text-[14px] font-semibold tracking-[-0.02em] text-ink">{workspace.name}</h2>
                    <p className="mt-0.5 font-mono text-[9.5px] text-faint">{workspace.slug}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-y border-line-soft py-2.5">
                      <div>
                        <p className="font-mono text-[13px] text-ink">{workspace._count.policies}</p>
                        <p className="text-[8.5px] uppercase tracking-[0.07em] text-faint">Policies</p>
                      </div>
                      <div>
                        <p className="font-mono text-[13px] text-ink">{workspace._count.risks}</p>
                        <p className="text-[8.5px] uppercase tracking-[0.07em] text-faint">Risks</p>
                      </div>
                      <div>
                        <p className="font-mono text-[13px] text-ink">{workspace._count.evidence}</p>
                        <p className="text-[8.5px] uppercase tracking-[0.07em] text-faint">Evidence</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-faint">
                      <span className="flex items-center gap-1">
                        <UsersRound className="size-2.5" /> {workspace._count.members} member{workspace._count.members === 1 ? "" : "s"}
                      </span>
                      <span>{membership.role.charAt(0) + membership.role.slice(1).toLowerCase()}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {active ? (
                        <Link href="/dashboard" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "flex-1")}>
                          Open workspace
                        </Link>
                      ) : (
                        <form action={switchWorkspaceAction} className="flex-1">
                          <input type="hidden" name="workspaceId" value={workspace.id} />
                          <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                            Switch to workspace
                          </button>
                        </form>
                      )}
                      <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")} aria-label={`Settings for ${workspace.name}`}>
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </div>
                    <p className="mt-2 text-[8.5px] text-faint">Created {formatDate(workspace.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-12 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                <Building2 className="size-5" />
              </span>
              <h2 className="mt-3 text-[15px] font-semibold text-ink">Create your first workspace</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-faint">
                A workspace is your tenant. It starts on the Growth plan with ISO 27001 and Cyber Essentials controls ready to
                assess.
              </p>
              <div className="mx-auto mt-4 max-w-sm text-left">
                <CreateWorkspaceForm action={createWorkspaceAction} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {memberships.length ? <CreateWorkspaceForm action={createWorkspaceAction} /> : null}

          <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              <CheckCircle2 className="size-3.5 text-mint" /> Tenant isolation
            </p>
            <ul className="mt-2.5 space-y-2 text-[10px] leading-relaxed text-faint">
              <li>Workspace ID is part of every read and write query.</li>
              <li>Membership and role are checked before each action.</li>
              <li>Evidence downloads are authorised per tenant.</li>
              <li>Switching workspaces never carries records across.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-panel/60 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Consultant workflow</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              Create a workspace per client, invite the client team as Members, and keep your own account as Admin or
              Consultant. Every client sees only their own tenant.
            </p>
            <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-[10px] text-sky-200 hover:text-sky-100">
              Compare consultant plans <ArrowUpRight className="size-2.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-brand/20 bg-brand/[0.035] p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200/80">
              <Plus className="size-3" /> Plan allowance
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
              Growth includes 1 workspace, Pro includes 3 and Consultant includes 20. This demo does not block creation when
              you exceed the allowance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
