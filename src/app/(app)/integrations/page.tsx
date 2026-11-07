import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, CircleDashed, Plug, RefreshCw, Unplug, XCircle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { CONNECTORS } from "@/lib/connectors";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDateTime } from "@/lib/utils";
import {
  connectIntegrationAction,
  disconnectIntegrationAction,
  syncIntegrationAction,
  testIntegrationAction,
} from "@/actions/integrations";

export const metadata: Metadata = { title: "Evidence automation" };
export const dynamic = "force-dynamic";

const STATE_TONE = { PASS: "mint", FAIL: "red", STALE: "neutral" } as const;

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [query, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const writable = canWrite(context.role);

  const integrations = await db.integration.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: { displayName: "asc" },
    include: { checks: { orderBy: { name: "asc" } } },
  });

  const checks = integrations.flatMap((integration) => integration.checks);
  const stats = [
    { label: "Automated checks", value: checks.length, tone: "text-ink" },
    { label: "Passing", value: checks.filter((check) => check.state === "PASS").length, tone: "text-emerald-200" },
    { label: "Failing", value: checks.filter((check) => check.state === "FAIL").length, tone: "text-red-200" },
    { label: "Stale", value: checks.filter((check) => check.state === "STALE").length, tone: "text-muted" },
    { label: "Controls w/ evidence", value: new Set(checks.map((check) => check.controlRef).filter(Boolean)).size, tone: "text-sky-200" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Continuous control monitoring (Clause 9.1)"
        title="Evidence Automation"
        description="Connectors collect evidence automatically and map it to controls."
      />

      {query.error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          <AlertTriangle className="size-3.5" /> {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={`mt-1.5 font-mono text-[23px] leading-none ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {integrations.length ? (
            integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg border border-line bg-raised text-sky-300">
                      <Plug className="size-3.5" />
                    </span>
                    <div>
                      <CardTitle>{integration.displayName}</CardTitle>
                      <p className="mt-0.5 text-[10.5px] text-faint">{integration.account ?? "No account recorded"}</p>
                    </div>
                  </div>
                  <Badge tone={integration.status === "CONNECTED" ? "mint" : "red"} dot>
                    {integration.status === "CONNECTED" ? "Connected" : "Error"}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-[10px] text-faint">
                    {integration.lastSyncAt ? `Last synced ${formatDateTime(integration.lastSyncAt)}` : "Never synced"}
                  </p>
                  {integration.lastError ? (
                    <p className="mt-1.5 rounded-lg border border-danger/20 bg-danger/[0.05] p-2 font-mono text-[9.5px] leading-relaxed text-red-200/80">
                      {integration.lastError}
                    </p>
                  ) : null}

                  <div className="mt-3 divide-y divide-line-soft">
                    {integration.checks.map((check) => {
                      const Icon = check.state === "PASS" ? CheckCircle2 : check.state === "FAIL" ? XCircle : CircleDashed;
                      return (
                        <div key={check.id} className="flex items-start gap-2 py-2">
                          <Icon
                            className={`mt-0.5 size-3.5 shrink-0 ${
                              check.state === "PASS" ? "text-mint" : check.state === "FAIL" ? "text-danger" : "text-faint"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-ink">{check.name}</p>
                            <p className="text-[9.5px] text-faint">
                              {check.controlRef ? `${check.controlRef} · ` : ""}
                              {check.detail}
                            </p>
                          </div>
                          <Badge tone={STATE_TONE[check.state as keyof typeof STATE_TONE] ?? "neutral"}>{check.state}</Badge>
                        </div>
                      );
                    })}
                  </div>

                  {writable ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
                      <form action={testIntegrationAction}>
                        <input type="hidden" name="id" value={integration.id} />
                        <SubmitButton variant="secondary" size="sm" pendingText="Testing…">
                          Test
                        </SubmitButton>
                      </form>
                      <form action={syncIntegrationAction}>
                        <input type="hidden" name="id" value={integration.id} />
                        <SubmitButton variant="secondary" size="sm" pendingText="Syncing…">
                          <RefreshCw className="size-3.5" /> Sync now
                        </SubmitButton>
                      </form>
                      <form action={disconnectIntegrationAction} className="ml-auto">
                        <input type="hidden" name="id" value={integration.id} />
                        <DangerSubmit
                          variant="ghost"
                          size="sm"
                          className="text-faint hover:text-red-300"
                          message={`Disconnect ${integration.displayName}? Its automated checks stop running.`}
                        >
                          <Unplug className="size-3.5" /> Disconnect
                        </DangerSubmit>
                      </form>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 px-4 py-16 text-center">
                <Plug className="size-5 text-faint" />
                <p className="text-[12.5px] font-medium text-ink">No systems connected yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Connect a system of record and the checks it supports are collected on a schedule, mapped to the controls they
                  evidence. Manual uploads stay available for everything a connector cannot see.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Connect a system</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Credentials are read from server environment variables.</p>
            </div>
          </CardHeader>
          <CardContent>
            <form action={connectIntegrationAction}>
              <Field label="System" htmlFor="provider">
                <Select id="provider" name="provider" defaultValue="github" disabled={!writable}>
                  {CONNECTORS.map((connector) => (
                    <option key={connector.provider} value={connector.provider}>
                      {connector.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Account" htmlFor="account" hint="Organisation, tenant, domain or site the connector should read.">
                <Input id="account" name="account" placeholder="e.g. auditix-labs" required disabled={!writable} />
              </Field>
              <div className="mt-1 space-y-1.5 rounded-lg border border-line-soft bg-canvas/40 p-2.5">
                {CONNECTORS.map((connector) => (
                  <p key={connector.provider} className="font-mono text-[9px] text-faint">
                    {connector.name}: {connector.envKey}
                  </p>
                ))}
              </div>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Connecting…" disabled={!writable}>
                  <Plug className="size-3.5" /> Connect
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
