import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, Info, KeyRound, Mail, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { AddMemberForm } from "@/components/settings/add-member-form";
import { WorkspaceNameForm } from "@/components/settings/workspace-name-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canManageWorkspace, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";
import { listMembers, planSeatLimit } from "@/lib/services/workspaces";
import {
  addMemberAction,
  removeMemberAction,
  renameWorkspaceAction,
  updateMemberRoleAction,
} from "@/actions/workspace";
import { formatDate } from "@/lib/utils";
import type { Role } from "@prisma/client";

export const metadata: Metadata = { title: "Team & settings" };
export const dynamic = "force-dynamic";

const ROLE_TONE: Record<Role, "brand" | "mint" | "violet"> = {
  ADMIN: "violet",
  MEMBER: "brand",
  CONSULTANT: "mint",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const admin = canManageWorkspace(context.role);
  const members = await listMembers(context.workspace.id);
  const seatLimit = planSeatLimit(context.plan);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace administration"
        title="Team & settings"
        description="Manage who can work in this workspace, what they can do, and the identity of the tenant itself."
      />

      {query.success ? (
        <div className="mb-4 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          {query.success}
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.035] px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-medium text-ink">
            You are {ROLE_LABELS[context.role]} in {context.workspace.name}
          </p>
          <p className="text-[10px] text-faint">{ROLE_DESCRIPTIONS[context.role]}</p>
        </div>
        <Badge tone={ROLE_TONE[context.role]}>{ROLE_LABELS[context.role]}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Members</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">
                  {members.length} of {seatLimit} seats used on the {context.workspace.plan.toLowerCase()} plan.
                </p>
              </div>
              <UsersRound className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-line-soft">
                {members.map((member) => {
                  const isSelf = member.userId === context.user.id;
                  return (
                    <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <Avatar name={member.user.name} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[11.5px] font-medium text-ink">
                          {member.user.name}
                          {isSelf ? <span className="text-[9px] text-faint">(you)</span> : null}
                          {member.role === "ADMIN" ? <Crown className="size-3 text-violet-300" /> : null}
                        </p>
                        <p className="truncate text-[10px] text-faint">{member.user.email}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-[10px] text-muted">{member.title ?? ROLE_LABELS[member.role]}</p>
                        <p className="text-[9px] text-faint">Joined {formatDate(member.createdAt)}</p>
                      </div>
                      {admin ? (
                        <div className="flex items-center gap-1.5">
                          <form action={updateMemberRoleAction} className="flex items-center gap-1">
                            <input type="hidden" name="memberId" value={member.id} />
                            <Select
                              name="role"
                              defaultValue={member.role}
                              className="h-7 w-[112px] text-[10px]"
                              aria-label={`Role for ${member.user.name}`}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Member</option>
                              <option value="CONSULTANT">Consultant</option>
                            </Select>
                            <SubmitButton variant="ghost" size="sm" className="h-7 px-2 text-[10px]" pendingText="…">
                              Save
                            </SubmitButton>
                          </form>
                          {!isSelf ? (
                            <form action={removeMemberAction}>
                              <input type="hidden" name="memberId" value={member.id} />
                              <DangerSubmit
                                variant="ghost"
                                size="icon"
                                className="size-7 text-faint hover:text-red-300"
                                message={`Remove ${member.user.name} from ${context.workspace.name}?`}
                                aria-label={`Remove ${member.user.name}`}
                              >
                                <Trash2 className="size-3.5" />
                              </DangerSubmit>
                            </form>
                          ) : null}
                        </div>
                      ) : (
                        <Badge tone={ROLE_TONE[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {admin ? <AddMemberForm action={addMemberAction} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Security posture</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">How this workspace protects tenant data.</p>
              </div>
              <KeyRound className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2">
              {[
                { label: "Authentication", value: "Signed HTTP-only session", detail: "7-day JWT, server verified" },
                { label: "Tenant isolation", value: "Every query scoped", detail: "workspaceId required on reads and writes" },
                { label: "Role enforcement", value: "Server-side RBAC", detail: "Actions check the active membership" },
                { label: "Evidence storage", value: "Private object store", detail: "SHA-256 checksum on upload" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-line bg-canvas/40 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.08em] text-faint">
                    <Check className="size-2.5 text-mint" /> {item.label}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-ink">{item.value}</p>
                  <p className="mt-0.5 text-[9.5px] text-faint">{item.detail}</p>
                </div>
              ))}
              <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-line-soft bg-canvas/40 px-3 py-2.5 text-[10px] leading-relaxed text-faint">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                SSO and SCIM are on the enterprise roadmap. This demo authenticates with email and password and does not
                complete a third-party IdP handshake.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace profile</CardTitle>
              <UserCog className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="pt-0">
              <WorkspaceNameForm name={context.workspace.name} action={renameWorkspaceAction} disabled={!admin} />
              <div className="mt-4 space-y-2.5 border-t border-line-soft pt-3 text-[10.5px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-faint">Slug</span>
                  <span className="font-mono text-[10px] text-muted">{context.workspace.slug}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-faint">Plan</span>
                  <Link href="/billing" className="text-sky-200 hover:text-sky-100">
                    {context.workspace.plan.charAt(0) + context.workspace.plan.slice(1).toLowerCase()} →
                  </Link>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-faint">Created</span>
                  <span className="text-muted">{formatDate(context.workspace.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-faint">Workspace ID</span>
                  <span className="max-w-[150px] truncate font-mono text-[9px] text-faint">{context.workspace.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles & permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {(["ADMIN", "MEMBER", "CONSULTANT"] as Role[]).map((role) => (
                <div key={role} className="rounded-xl border border-line bg-canvas/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-ink">{ROLE_LABELS[role]}</p>
                    <Badge tone={ROLE_TONE[role]}>{members.filter((member) => member.role === role).length}</Badge>
                  </div>
                  <p className="mt-1 text-[9.5px] leading-relaxed text-faint">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              ))}
              <p className="text-[9px] leading-relaxed text-faint">
                Admins manage billing and the team. Members can create and edit compliance records. Consultants deliver across
                client workspaces.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspaces</CardTitle>
              <Mail className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[10.5px] leading-relaxed text-faint">
                You belong to {context.memberships.length} workspace{context.memberships.length === 1 ? "" : "s"}. Switching
                changes every query to the selected tenant.
              </p>
              <Link href="/workspaces" className={buttonVariants({ variant: "secondary", size: "sm" }) + " mt-3 w-full"}>
                Manage workspaces
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
