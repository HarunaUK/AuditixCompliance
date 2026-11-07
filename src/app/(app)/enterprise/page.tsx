import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AlertTriangle, BadgeCheck, CheckCircle2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { ClearFlashCookie } from "@/components/enterprise/clear-flash-cookie";
import { db } from "@/lib/db";
import { canManageWorkspace } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDateTime } from "@/lib/utils";
import {
  mintScimTokenAction,
  requestDnsTokenAction,
  revokeScimTokenAction,
  saveSsoSettingsAction,
  verifyDomainAction,
} from "@/actions/enterprise";

export const metadata: Metadata = { title: "Enterprise & SSO" };
export const dynamic = "force-dynamic";

export default async function EnterprisePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [query, context, store] = await Promise.all([searchParams, getWorkspaceContext(), cookies()]);
  const admin = canManageWorkspace(context.role);
  const flashToken = store.get("auditix_scim_flash")?.value;

  const [settings, tokens, events] = await Promise.all([
    db.ssoSettings.findUnique({ where: { workspaceId: context.workspace.id } }),
    db.scimToken.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.auditEvent.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const txtName = settings?.emailDomain ? `_auditix-challenge.${settings.emailDomain}` : "_auditix-challenge.your-domain";

  return (
    <div>
      <PageHeader
        eyebrow="Account"
        title="Enterprise & Security"
        description="Single sign-on, automated provisioning (SCIM), and the admin audit trail."
      />

      {query.error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          <AlertTriangle className="size-3.5" /> {query.error}
        </div>
      ) : null}
      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" />
          {query.saved === "scim"
            ? "SCIM token minted — copy it now, it is not shown again."
            : query.saved === "verified"
              ? "Domain verified. You can enable SSO."
              : query.saved === "revoked"
                ? "SCIM token revoked."
                : "Settings saved."}
        </div>
      ) : null}

      {flashToken ? (
        <div className="mb-4 rounded-xl border border-warning/25 bg-warning/[0.06] p-3.5">
          <ClearFlashCookie name="auditix_scim_flash" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">New SCIM token</p>
          <p className="mt-1.5 break-all rounded-lg border border-line bg-canvas/60 px-2.5 py-2 font-mono text-[11px] text-ink">
            {flashToken}
          </p>
          <p className="mt-1.5 text-[10px] text-amber-100/70">
            Store it in your identity provider now. Only a hash is kept here, so it cannot be recovered later.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-line bg-raised text-sky-300">
                <Lock className="size-3.5" />
              </span>
              <div>
                <CardTitle>Single sign-on (OIDC)</CardTitle>
                <p className="mt-0.5 text-[10.5px] text-faint">Bring your identity provider; users are matched on email domain.</p>
              </div>
            </div>
            <Badge tone={settings?.enabled ? "mint" : "neutral"} dot>
              {settings?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={saveSsoSettingsAction}>
              <label className="mb-4 flex items-center gap-2 text-[11.5px] text-muted">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={settings?.enabled ?? false}
                  disabled={!admin}
                  className="size-3.5 rounded border-line bg-canvas accent-sky-400"
                />
                Require SSO for accounts on this domain
              </label>

              <div className="grid gap-x-3 sm:grid-cols-2">
                <Field label="Email domain" htmlFor="emailDomain">
                  <Input
                    id="emailDomain"
                    name="emailDomain"
                    placeholder="acme.com"
                    defaultValue={settings?.emailDomain ?? ""}
                    disabled={!admin}
                  />
                </Field>
                <Field label="Default role for new users" htmlFor="defaultRole">
                  <Select id="defaultRole" name="defaultRole" defaultValue={settings?.defaultRole ?? "MEMBER"} disabled={!admin}>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                    <option value="CONSULTANT">Consultant</option>
                  </Select>
                </Field>
              </div>

              <Field label="OIDC discovery URL" htmlFor="discoveryUrl">
                <Input
                  id="discoveryUrl"
                  name="discoveryUrl"
                  placeholder="https://idp/.well-known/openid-configuration"
                  defaultValue={settings?.discoveryUrl ?? ""}
                  disabled={!admin}
                />
              </Field>
              <div className="grid gap-x-3 sm:grid-cols-2">
                <Field label="Client ID" htmlFor="clientId">
                  <Input id="clientId" name="clientId" defaultValue={settings?.clientId ?? ""} disabled={!admin} />
                </Field>
                <Field
                  label="Client secret"
                  htmlFor="clientSecret"
                  hint={settings?.clientSecret ? "A secret is stored. Leave blank to keep it." : "Stored as a hash, never shown again."}
                >
                  <Input
                    id="clientSecret"
                    name="clientSecret"
                    type="password"
                    placeholder={settings?.clientSecret ? "••••••••" : ""}
                    disabled={!admin}
                  />
                </Field>
              </div>

              <div className="rounded-lg border border-line-soft bg-canvas/40 p-3">
                <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-ink">
                  <ShieldCheck className="size-3.5 text-brand" /> Domain ownership
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-faint">
                  Add this TXT record to your DNS and keep it in place while SSO is enabled. Verification reads DNS, so it only passes
                  once the record is live.
                </p>
                <div className="mt-2 grid gap-1 font-mono text-[9.5px] text-muted">
                  <p>TXT · {txtName}</p>
                  <p className="break-all">VALUE · {settings?.dnsToken ?? "Request a record to generate the value"}</p>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <SubmitButton formAction={requestDnsTokenAction} variant="secondary" size="sm" disabled={!admin} pendingText="Generating…">
                    Get DNS verification record
                  </SubmitButton>
                  <SubmitButton formAction={verifyDomainAction} variant="secondary" size="sm" disabled={!admin} pendingText="Checking DNS…">
                    Verify domain
                  </SubmitButton>
                  {settings?.domainVerified ? (
                    <Badge tone="mint">
                      <BadgeCheck className="size-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Not verified</Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
                <p className="text-[9.5px] text-faint">IdP test login: /api/v1/sso/login?domain={settings?.emailDomain ?? "your-domain"}</p>
                <SubmitButton variant="primary" disabled={!admin} pendingText="Saving…">
                  Save SSO settings
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg border border-line bg-raised text-violet-300">
                <KeyRound className="size-3.5" />
              </span>
              <CardTitle>SCIM provisioning tokens</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form action={mintScimTokenAction}>
              <Field label="Token name" htmlFor="name">
                <Input id="name" name="name" placeholder="Okta production" disabled={!admin} />
              </Field>
              <Field label="Provisioned role" htmlFor="role" className="mb-0">
                <Select id="role" name="role" defaultValue="MEMBER" disabled={!admin}>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                  <option value="CONSULTANT">Consultant</option>
                </Select>
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="secondary" disabled={!admin} pendingText="Minting…">
                  Mint token
                </SubmitButton>
              </div>
            </form>

            <div className="mt-4 border-t border-line-soft pt-3">
              {tokens.length ? (
                <div className="divide-y divide-line-soft">
                  {tokens.map((token) => (
                    <div key={token.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-ink">{token.name}</p>
                        <p className="font-mono text-[9.5px] text-faint">
                          {token.prefix}… · {token.role.toLowerCase()} · {formatDateTime(token.createdAt)}
                        </p>
                      </div>
                      {token.revokedAt ? (
                        <Badge tone="neutral">Revoked</Badge>
                      ) : admin ? (
                        <form action={revokeScimTokenAction}>
                          <input type="hidden" name="id" value={token.id} />
                          <DangerSubmit
                            variant="ghost"
                            size="sm"
                            className="text-faint hover:text-red-300"
                            message={`Revoke the SCIM token “${token.name}”?`}
                          >
                            Revoke
                          </DangerSubmit>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10.5px] text-faint">No tokens yet.</p>
              )}
              <p className="mt-3 font-mono text-[9px] leading-relaxed text-faint">
                SCIM base URL: /api/v1/scim/v2 · auth: Authorization: Bearer &lt;token&gt;
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Admin audit trail</CardTitle>
          <Badge tone="outline">{events.length} recent</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          {events.length ? (
            <div className="divide-y divide-line-soft">
              {events.map((event) => (
                <div key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[10.5px] text-sky-200">{event.action}</p>
                    <p className="text-[10.5px] text-muted">{event.summary}</p>
                  </div>
                  <p className="text-[9.5px] text-faint">{formatDateTime(event.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[10.5px] text-faint">No admin activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
