import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Plan, Role, Workspace } from "@prisma/client";

export const WORKSPACE_COOKIE = "auditix_workspace";

export type MembershipSummary = {
  id: string;
  role: Role;
  title: string | null;
  workspace: Pick<Workspace, "id" | "name" | "slug" | "plan" | "createdAt">;
};

export type WorkspaceContext = {
  user: { id: string; name: string; email: string; createdAt: Date };
  membership: MembershipSummary;
  workspace: MembershipSummary["workspace"];
  role: Role;
  plan: Plan;
  memberships: MembershipSummary[];
};

const membershipsFor = cache(async (userId: string) => {
  return db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: { select: { id: true, name: true, slug: true, plan: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  }) as Promise<MembershipSummary[]>;
});

export async function listMemberships(userId: string) {
  return membershipsFor(userId);
}

export async function resolveMembership(userId: string, requestedWorkspaceId?: string | null) {
  const memberships = await membershipsFor(userId);
  if (memberships.length === 0) return { memberships, membership: null };
  const membership =
    (requestedWorkspaceId ? memberships.find((item) => item.workspace.id === requestedWorkspaceId) : undefined) ??
    memberships[0];
  return { memberships, membership };
}

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const user = await requireUser();
  const store = await cookies();
  const requested = store.get(WORKSPACE_COOKIE)?.value;
  const { memberships, membership } = await resolveMembership(user.id, requested);

  if (!membership) redirect("/workspaces");

  return {
    user,
    membership,
    workspace: membership.workspace,
    role: membership.role,
    plan: membership.workspace.plan,
    memberships,
  };
}

export async function setActiveWorkspaceCookie(workspaceId: string) {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function setActiveWorkspace(userId: string, workspaceId: string) {
  const { memberships } = await resolveMembership(userId, workspaceId);
  const allowed = memberships.some((item) => item.workspace.id === workspaceId);
  if (!allowed) return false;
  await setActiveWorkspaceCookie(workspaceId);
  return true;
}

export async function clearActiveWorkspace() {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
