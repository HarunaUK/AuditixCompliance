import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, RefreshCw, ScanLine, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getProfile, profileCompleteness } from "@/lib/services/isms";
import { generateScopeAction, saveScopeAction } from "@/actions/isms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "ISMS scope" };
export const dynamic = "force-dynamic";

export default async function ScopePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; generated?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const [workspace, profile, controlRows] = await Promise.all([
    db.workspace.findUnique({
      where: { id: context.workspace.id },
      select: { name: true, scopeStatement: true, scopeUpdatedAt: true },
    }),
    getProfile(context.workspace.id),
    db.workspaceControl.findMany({
      where: { workspaceId: context.workspace.id },
      select: { control: { select: { framework: { select: { name: true } } } } },
    }),
  ]);
  if (!workspace) return null;

  const frameworks = Array.from(new Set(controlRows.map((row) => row.control.framework.name)));
  const completeness = profileCompleteness(profile);
  const hasScope = Boolean(workspace.scopeStatement?.trim());

  return (
    <div>
      <PageHeader
        eyebrow="ISMS scope · Clause 4.3"
        title="Scope statement"
        description="The boundaries and applicability of the ISMS. This is the first document an auditor opens: it must name the organisation, the services, the locations and the dependencies, and explain anything excluded."
        actions={
          <>
            <Link href="/context" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Context & parties
            </Link>
            <Link href="/soa" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Statement of Applicability <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Scope statement saved.
        </div>
      ) : null}
      {query.generated ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-[11.5px] text-sky-200">
          <Sparkles className="size-3.5" /> A draft scope was generated from the intake. Review every sentence before relying on it.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      {!hasScope ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>No scope statement yet</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Clause 4.3 requires a documented ISMS scope.</p>
              </div>
              <Badge tone="amber">Required</Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed border-line bg-canvas/30 px-4 py-8 text-center">
                <ScanLine className="mx-auto size-6 text-brand" />
                <p className="mt-3 text-[12.5px] font-medium text-ink">Generate a first draft, then edit it.</p>
                <p className="mx-auto mt-1.5 max-w-lg text-[11px] leading-relaxed text-faint">
                  The draft is built deterministically from your organisation intake and the frameworks enabled in this
                  workspace. It is a starting point, not an approved scope: an owner must review the boundaries, exclusions and
                  dependencies.
                </p>
                <form action={generateScopeAction} className="mt-5">
                  <SubmitButton variant="primary" pendingText="Generating…" disabled={!writable}>
                    <Sparkles className="size-3.5" /> Generate from intake
                  </SubmitButton>
                </form>
                <p className="mt-3 text-[10px] text-faint">
                  {completeness}% intake complete ·{" "}
                  <Link href="/onboarding" className="text-sky-200 hover:text-sky-100">
                    improve the intake
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="self-start">
            <CardHeader>
              <CardTitle>What the draft will say</CardTitle>
              <FileText className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-[10.5px] leading-relaxed text-muted">
              <p>The organisation and the services in scope.</p>
              <p>The locations, cloud platforms and SaaS dependencies that carry the information.</p>
              <p>The categories of information whose confidentiality, integrity and availability are protected.</p>
              <p>The frameworks the management system is assessed against.</p>
              <p>An explicit exclusions sentence for a human to complete.</p>
              <div className="border-t border-line-soft pt-3">
                <p className="text-[9.5px] uppercase tracking-[0.1em] text-faint">Enabled frameworks</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {frameworks.length ? (
                    frameworks.map((framework) => (
                      <Badge key={framework} tone="outline">
                        {framework}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-faint">None loaded</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Documented scope</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">
                  Last updated {workspace.scopeUpdatedAt ? formatDateTime(workspace.scopeUpdatedAt) : "at generation"}
                </p>
              </div>
              <Badge tone="mint">Recorded</Badge>
            </CardHeader>
            <CardContent>
              <form action={saveScopeAction}>
                <Textarea
                  name="statement"
                  rows={18}
                  defaultValue={workspace.scopeStatement ?? ""}
                  className="min-h-[420px] text-[12px] leading-[1.85]"
                  aria-label="ISMS scope statement"
                  required
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="max-w-lg text-[9.5px] leading-relaxed text-faint">
                    Review the boundaries, locations, systems and exclusions. Saving writes the change to the audit trail with
                    your name on it.
                  </p>
                  <SubmitButton variant="primary" pendingText="Saving…" disabled={!writable}>
                    Save scope statement
                  </SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scope facts</CardTitle>
                <Badge tone="outline">{completeness}% intake</Badge>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0 text-[10.5px]">
                {[
                  ["Organisation", profile?.companyName ?? workspace.name],
                  ["Industry", profile?.industry ?? "Not recorded"],
                  ["Geography", profile?.geography ?? "Not recorded"],
                  ["Headcount", profile?.headcount?.toString() ?? "Not recorded"],
                  ["Data types", profile?.dataTypes ?? "Not recorded"],
                  ["Cloud", profile?.cloudProviders ?? "Not recorded"],
                  ["SaaS", profile?.saasTools ?? "Not recorded"],
                  ["Key systems", profile?.keySystems ?? "Not recorded"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0">
                    <span className="shrink-0 text-faint">{label}</span>
                    <span className="text-right leading-relaxed text-muted">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regenerate</CardTitle>
                <RefreshCw className="size-3.5 text-faint" />
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-[10px] leading-relaxed text-faint">
                  Regenerating replaces the current statement with a fresh draft from the latest intake. Save any wording you
                  want to keep before continuing.
                </p>
                <form action={generateScopeAction} className="mt-3">
                  <SubmitButton variant="secondary" size="sm" className="w-full" pendingText="Regenerating…" disabled={!writable}>
                    <RefreshCw className="size-3" /> Regenerate from intake
                  </SubmitButton>
                </form>
                <Link href="/onboarding" className="mt-2 block text-center text-[10px] text-sky-200 hover:text-sky-100">
                  Edit the organisation intake
                </Link>
              </CardContent>
            </Card>

            <div className="rounded-xl border border-brand/20 bg-brand/[0.04] px-3.5 py-3 text-[10px] leading-relaxed text-sky-200/80">
              The scope must stay consistent with the Statement of Applicability. If you exclude an activity here, record the
              corresponding control exclusion and its justification there.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
