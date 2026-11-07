"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { clearActiveWorkspace, setActiveWorkspace, setActiveWorkspaceCookie } from "@/lib/workspace";
import { loginSchema, registerSchema } from "@/lib/validation";
import { createWorkspaceForUser } from "@/lib/services/workspaces";
import { recordActivity } from "@/lib/services/activity";

export type AuthState = { error?: string; fields?: Record<string, string[]> } | null;

export async function loginAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password.", fields: parsed.error.flatten().fieldErrors };
  }

  // Fetch the first workspace in the same round trip as the credential lookup.
  // Sign-in used to re-validate membership through two extra queries after
  // bcrypt had already finished.
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      name: true,
      passwordHash: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { workspaceId: true },
      },
    },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Those credentials do not match an Auditix account." };
  }

  await createSession(user.id);
  const workspaceId = user.memberships[0]?.workspaceId;
  if (workspaceId) await setActiveWorkspaceCookie(workspaceId);
  redirect("/dashboard");
}

export async function registerAction(_state: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName"),
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fields: parsed.error.flatten().fieldErrors };
  }

  const existing = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return { error: "An account already uses that email. Try signing in instead." };

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });

  let workspaceId: string;
  try {
    const workspace = await createWorkspaceForUser(user.id, parsed.data.workspaceName);
    workspaceId = workspace.id;
  } catch (error) {
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    console.error(error);
    return { error: "We could not create the workspace. Please try again." };
  }

  await recordActivity({
    workspaceId,
    actor: { id: user.id, name: user.name },
    action: "workspace.created",
    entityType: "Workspace",
    entityId: workspaceId,
    summary: `Created workspace “${parsed.data.workspaceName}”`,
    detail: "Owner account provisioned",
  });

  await createSession(user.id);
  await setActiveWorkspace(user.id, workspaceId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  await clearActiveWorkspace();
  redirect("/login");
}
