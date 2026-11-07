"use server";

import { createHash, randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canManageWorkspace } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";

const ROLES = new Set(["ADMIN", "MEMBER", "CONSULTANT"]);

function generateToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function saveSsoSettingsAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/enterprise?error=Only+an+admin+can+change+SSO");

  const enabled = formData.get("enabled") === "on";
  const emailDomain = String(formData.get("emailDomain") ?? "").trim().toLowerCase() || null;
  const defaultRole = String(formData.get("defaultRole") ?? "MEMBER").toUpperCase();
  const discoveryUrl = String(formData.get("discoveryUrl") ?? "").trim() || null;
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();

  if (!ROLES.has(defaultRole)) redirect("/enterprise?error=Unknown+default+role");
  if (enabled && (!emailDomain || !discoveryUrl || !clientId)) {
    redirect("/enterprise?error=Domain%2C+discovery+URL+and+client+ID+are+required+to+enable+SSO");
  }

  const existing = await db.ssoSettings.findUnique({ where: { workspaceId: context.workspace.id } });
  const data = {
    enabled,
    emailDomain,
    defaultRole,
    discoveryUrl,
    clientId,
    ...(clientSecret ? { clientSecret: hashToken(clientSecret) } : {}),
  };

  await db.ssoSettings.upsert({
    where: { workspaceId: context.workspace.id },
    update: data,
    create: {
      workspaceId: context.workspace.id,
      ...data,
      dnsToken: generateToken(12),
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: enabled ? "sso.enabled" : "sso.disabled",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: enabled ? `Enabled SSO for ${emailDomain}` : "Updated SSO settings",
    detail: enabled ? `Discovery URL ${discoveryUrl}` : null,
  });

  revalidatePath("/enterprise");
  redirect("/enterprise?saved=sso");
}

export async function requestDnsTokenAction() {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/enterprise?error=Only+an+admin+can+verify+the+domain");

  const existing = await db.ssoSettings.findUnique({ where: { workspaceId: context.workspace.id } });
  const token = existing?.dnsToken ?? `auditix-verify-${generateToken(10)}`;

  await db.ssoSettings.upsert({
    where: { workspaceId: context.workspace.id },
    update: { dnsToken: token },
    create: { workspaceId: context.workspace.id, dnsToken: token },
  });

  revalidatePath("/enterprise");
  redirect("/enterprise?saved=dns");
}

export async function verifyDomainAction() {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/enterprise?error=Only+an+admin+can+verify+the+domain");

  const settings = await db.ssoSettings.findUnique({ where: { workspaceId: context.workspace.id } });
  if (!settings?.dnsToken || !settings.emailDomain) {
    redirect("/enterprise?error=Add+your+email+domain+and+request+a+TXT+record+first");
  }

  // A real TXT lookup, so the check means something outside this database.
  let verified = false;
  try {
    const records = await resolveTxt(`_auditix-challenge.${settings.emailDomain}`);
    verified = records.some((entry) => entry.join("").trim() === settings.dnsToken);
  } catch {
    verified = false;
  }

  await db.ssoSettings.update({
    where: { workspaceId: context.workspace.id },
    data: { domainVerified: verified },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: verified ? "sso.domain_verified" : "sso.domain_verification_failed",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: verified ? `Verified ${settings.emailDomain} for SSO` : `DNS verification failed for ${settings.emailDomain}`,
  });

  revalidatePath("/enterprise");
  redirect(verified ? "/enterprise?saved=verified" : "/enterprise?error=TXT+record+not+found+or+does+not+match");
}

export async function mintScimTokenAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/enterprise?error=Only+an+admin+can+mint+SCIM+tokens");

  const name = String(formData.get("name") ?? "").trim() || "Provisioning token";
  const role = String(formData.get("role") ?? "MEMBER").toUpperCase();
  if (!ROLES.has(role)) redirect("/enterprise?error=Unknown+provisioned+role");

  const token = `ax_scim_${generateToken(24)}`;
  await db.scimToken.create({
    data: {
      workspaceId: context.workspace.id,
      name,
      role,
      prefix: token.slice(0, 14),
      tokenHash: hashToken(token),
    },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scim.token_minted",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Minted SCIM token “${name}” (${role.toLowerCase()})`,
  });

  const store = await cookies();
  store.set("auditix_scim_flash", token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/enterprise",
    maxAge: 120,
  });

  revalidatePath("/enterprise");
  redirect("/enterprise?saved=scim");
}

export async function revokeScimTokenAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canManageWorkspace(context.role)) redirect("/enterprise?error=Only+an+admin+can+revoke+SCIM+tokens");
  const id = String(formData.get("id") ?? "");

  const token = await db.scimToken.findFirst({
    where: { id, workspaceId: context.workspace.id, revokedAt: null },
    select: { id: true, name: true },
  });
  if (!token) redirect("/enterprise?error=Unknown+token");

  await db.scimToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "scim.token_revoked",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Revoked SCIM token “${token.name}”`,
  });

  revalidatePath("/enterprise");
  redirect("/enterprise?saved=revoked");
}
