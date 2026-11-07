import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MEMBER: "Member",
  CONSULTANT: "Consultant",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full control of the workspace, billing and team.",
  MEMBER: "Can create and edit policies, risks and evidence.",
  CONSULTANT: "Client delivery access across assigned workspaces.",
};

export function canWrite(role: Role) {
  return role === "ADMIN" || role === "MEMBER" || role === "CONSULTANT";
}

export function canManageWorkspace(role: Role) {
  return role === "ADMIN";
}
