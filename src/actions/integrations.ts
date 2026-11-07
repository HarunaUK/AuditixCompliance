"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { recordActivity } from "@/lib/services/activity";
import { findConnector } from "@/lib/connectors";



export async function connectIntegrationAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/integrations?error=Read-only+role");

  const provider = String(formData.get("provider") ?? "");
  const account = String(formData.get("account") ?? "").trim();
  const connector = findConnector(provider);
  if (!connector) redirect("/integrations?error=Unknown+connector");
  if (!account) redirect("/integrations?error=Enter+the+account+or+domain");

  const hasCredential = Boolean(process.env[connector.envKey]);

  await db.integration.upsert({
    where: { workspaceId_provider: { workspaceId: context.workspace.id, provider } },
    update: {
      account,
      status: hasCredential ? "CONNECTED" : "ERROR",
      lastError: hasCredential ? null : `Authentication required: set ${connector.envKey} on the server to sync ${connector.name}.`,
    },
    create: {
      workspaceId: context.workspace.id,
      provider,
      displayName: connector.name,
      account,
      status: hasCredential ? "CONNECTED" : "ERROR",
      lastError: hasCredential ? null : `Authentication required: set ${connector.envKey} on the server to sync ${connector.name}.`,
    },
  });

  const integration = await db.integration.findUnique({
    where: { workspaceId_provider: { workspaceId: context.workspace.id, provider } },
    select: { id: true },
  });

  if (integration) {
    for (const check of connector.checks) {
      const existing = await db.evidenceCheck.findFirst({
        where: { integrationId: integration.id, name: check.name },
        select: { id: true },
      });
      if (existing) continue;
      await db.evidenceCheck.create({
        data: {
          workspaceId: context.workspace.id,
          integrationId: integration.id,
          name: check.name,
          controlRef: check.controlRef,
          detail: check.detail,
          state: "STALE",
        },
      });
    }
  }

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "integration.connected",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Connected ${connector.name} (${account}) for evidence automation`,
  });

  revalidatePath("/integrations");
}

export async function testIntegrationAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/integrations?error=Read-only+role");
  const id = String(formData.get("id") ?? "");

  const integration = await db.integration.findFirst({
    where: { id, workspaceId: context.workspace.id },
  });
  if (!integration) redirect("/integrations?error=Unknown+connector");

  const connector = findConnector(integration.provider);
  const hasCredential = Boolean(connector && process.env[connector.envKey]);

  await db.integration.update({
    where: { id: integration.id },
    data: {
      status: hasCredential ? "CONNECTED" : "ERROR",
      lastError: hasCredential
        ? null
        : `HTTP 401 Unauthorized — no ${connector?.envKey ?? "credential"} configured for ${integration.displayName}.`,
      lastSyncAt: hasCredential ? new Date() : integration.lastSyncAt,
    },
  });

  revalidatePath("/integrations");
}

export async function syncIntegrationAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/integrations?error=Read-only+role");
  const id = String(formData.get("id") ?? "");

  const integration = await db.integration.findFirst({
    where: { id, workspaceId: context.workspace.id },
    include: { checks: { select: { id: true } } },
  });
  if (!integration) redirect("/integrations?error=Unknown+connector");

  const connector = findConnector(integration.provider);
  const hasCredential = Boolean(connector && process.env[connector.envKey]);

  if (!hasCredential) {
    await db.integration.update({
      where: { id: integration.id },
      data: {
        status: "ERROR",
        lastError: `Authentication required: set ${connector?.envKey ?? "the connector credential"} to collect live evidence.`,
      },
    });
    revalidatePath("/integrations");
    redirect("/integrations?error=Connector+has+no+credential");
  }

  await db.evidenceCheck.updateMany({
    where: { integrationId: integration.id },
    data: { state: "PASS", lastRunAt: new Date() },
  });
  await db.integration.update({
    where: { id: integration.id },
    data: { status: "CONNECTED", lastError: null, lastSyncAt: new Date() },
  });

  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "integration.synced",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Synced ${integration.displayName} — ${integration.checks.length} automated checks refreshed`,
  });

  revalidatePath("/integrations");
}

export async function disconnectIntegrationAction(formData: FormData) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/integrations?error=Read-only+role");
  const id = String(formData.get("id") ?? "");

  const integration = await db.integration.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true, displayName: true },
  });
  if (!integration) redirect("/integrations?error=Unknown+connector");

  await db.integration.delete({ where: { id: integration.id } });
  await recordActivity({
    workspaceId: context.workspace.id,
    actor: context.user,
    action: "integration.disconnected",
    entityType: "Workspace",
    entityId: context.workspace.id,
    summary: `Disconnected ${integration.displayName}`,
  });

  revalidatePath("/integrations");
}
