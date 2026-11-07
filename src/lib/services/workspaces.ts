import "server-only";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { PLANS } from "@/lib/plans";
import type { Plan, Role } from "@prisma/client";

export class WorkspaceError extends Error {}

export async function uniqueSlug(name: string) {
  const base = slugify(name) || "workspace";
  let candidate = base;
  let suffix = 2;
  while (await db.workspace.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createWorkspaceForUser(userId: string, name: string) {
  const slug = await uniqueSlug(name);
  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name,
        slug,
        plan: "GROWTH",
        members: { create: { userId, role: "ADMIN", title: "Workspace owner" } },
      },
    });

    const controls = await tx.frameworkControl.findMany({ select: { id: true } });
    if (controls.length) {
      await tx.workspaceControl.createMany({
        data: controls.map((control) => ({
          workspaceId: workspace.id,
          controlId: control.id,
          status: "NOT_STARTED" as const,
        })),
      });
    }

    const policy = await tx.policy.create({
      data: {
        workspaceId: workspace.id,
        title: "Information Security Policy",
        category: "Governance",
        summary: "Start here: define the commitment, scope and governance of your ISMS.",
        content:
          "# Information Security Policy\n\n## Purpose\nDescribe why information security matters to the organization.\n\n## Scope\nWho and what this policy applies to.\n\n## Policy statements\n- Information security is owned at leadership level.\n- Risks are recorded and treated.\n- Incidents are reported promptly.\n\n## Review\nThis policy is reviewed at least annually.",
        status: "DRAFT",
        version: 1,
        ownerId: userId,
        reviewDueAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
    await tx.policyVersion.create({
      data: {
        policyId: policy.id,
        version: 1,
        title: policy.title,
        content: policy.content,
        status: policy.status,
        changedById: userId,
        note: "Workspace baseline",
      },
    });

    return workspace;
  });
}

export async function listWorkspaces(userId: string) {
  return db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          _count: { select: { policies: true, risks: true, evidence: true, members: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceForMember(userId: string, workspaceId: string) {
  return db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
}

export async function listMembers(workspaceId: string) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function addMember(workspaceId: string, email: string, role: Role, title?: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new WorkspaceError("No Auditix account uses that email yet. Ask them to create an account first, then add them.");
  }
  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (existing) throw new WorkspaceError("That person is already a member of this workspace.");

  return db.workspaceMember.create({
    data: { workspaceId, userId: user.id, role, title: title || null },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function updateMemberRole(workspaceId: string, memberId: string, role: Role) {
  const member = await db.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new WorkspaceError("Member not found.");
  if (member.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.workspaceMember.count({ where: { workspaceId, role: "ADMIN" } });
    if (admins <= 1) throw new WorkspaceError("A workspace needs at least one admin.");
  }
  return db.workspaceMember.update({ where: { id: member.id }, data: { role } });
}

export async function removeMember(workspaceId: string, memberId: string, actorId: string) {
  const member = await db.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new WorkspaceError("Member not found.");
  if (member.userId === actorId) throw new WorkspaceError("You cannot remove yourself from the workspace.");
  if (member.role === "ADMIN") {
    const admins = await db.workspaceMember.count({ where: { workspaceId, role: "ADMIN" } });
    if (admins <= 1) throw new WorkspaceError("A workspace needs at least one admin.");
  }
  await db.workspaceMember.delete({ where: { id: member.id } });
}

export async function changePlan(workspaceId: string, plan: Plan) {
  return db.workspace.update({ where: { id: workspaceId }, data: { plan } });
}

export async function renameWorkspace(workspaceId: string, name: string) {
  return db.workspace.update({ where: { id: workspaceId }, data: { name } });
}

export async function workspaceStats(workspaceId: string) {
  const [members, policies, risks, evidence] = await Promise.all([
    db.workspaceMember.count({ where: { workspaceId } }),
    db.policy.count({ where: { workspaceId } }),
    db.risk.count({ where: { workspaceId } }),
    db.evidence.count({ where: { workspaceId } }),
  ]);
  return { members, policies, risks, evidence };
}

export function planSeatLimit(plan: Plan) {
  return PLANS[plan].seats;
}
