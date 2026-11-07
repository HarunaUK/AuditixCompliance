import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, CheckCircle2, CircleAlert, Download, FileCheck2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { cn, formatDate } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { setCyberEssentialsStatusAction } from "@/actions/frameworks";

export const metadata: Metadata = { title: "Cyber Essentials" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "IMPLEMENTED", label: "Fully met" },
  { value: "IN_PROGRESS", label: "Partly met" },
  { value: "NOT_STARTED", label: "Not met" },
  { value: "NOT_APPLICABLE", label: "N/A" },
] as const;

const EVIDENCE_HINTS: Record<string, string> = {
  "CE-1": "Firewall rule export, boundary diagram, host firewall policy and a recent configuration review.",
  "CE-2": "Build standard, hardening benchmark output, disabled-service list and change records.",
  "CE-3": "Access matrix, MFA configuration, joiner/leaver tickets and a quarterly access review.",
  "CE-4": "EDR console coverage report, malware policy and alert triage samples.",
  "CE-5": "Patch compliance report, vulnerability scan output and documented remediation timescales.",
};

const PLUS_THEMES = [
  {
    title: "Patch management",
    detail: "Documented patching SLAs by severity, with evidence that high-risk updates are applied within 14 days.",
    evidence: "Patch compliance reports for the last three months and exception approvals.",
  },
  {
    title: "Multi-factor authentication",
    detail: "MFA enforced for remote access, email, cloud administration and all privileged accounts.",
    evidence: "Identity provider policy export and a sample of enforced admin accounts.",
  },
  {
    title: "Backup and recovery",
    detail: "Backups are protected from ransomware, tested on a schedule and cover the systems the business needs.",
    evidence: "Backup schedule, restore test record with timestamps and integrity check results.",
  },
  {
    title: "Monitoring and logging",
    detail: "Security events are collected centrally, alerting is configured and logs are retained.",
    evidence: "Log source inventory, alert rules and an example investigation timeline.",
  },
  {
    title: "Incident response",
    detail: "A tested plan with named roles, reporting routes and post-incident review.",
    evidence: "Incident runbook, last tabletop or live exercise and corrective actions.",
  },
];

export default async function CyberEssentialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [params, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const tab = params.tab === "plus" ? "plus" : "base";
  const framework = await db.framework.findUnique({
    where: { key: "cyber-essentials" },
    include: {
      controls: {
        orderBy: { sortOrder: "asc" },
        include: {
          workspaceControls: { where: { workspaceId: context.workspace.id } },
          evidence: { where: { workspaceId: context.workspace.id }, select: { id: true, name: true, createdAt: true } },
        },
      },
    },
  });
  const writable = canWrite(context.role);
  const rows = framework?.controls ?? [];
  const applicable = rows.filter((row) => row.workspaceControls[0]?.status !== "NOT_APPLICABLE").length;
  const met = rows.filter((row) => row.workspaceControls[0]?.status === "IMPLEMENTED").length;
  const partial = rows.filter((row) => row.workspaceControls[0]?.status === "IN_PROGRESS").length;
  const percent = applicable > 0 ? Math.round((met / applicable) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Offensive · certification baseline"
        title="Cyber Essentials"
        description="The NCSC's five technical controls, assessed against evidence rather than assertion. CE Plus adds five assurance themes."
        actions={
          <>
            <Link href="/evidence" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <FileCheck2 className="size-3.5" /> Evidence
            </Link>
            <a href="/api/v1/frameworks/cyber-essentials/export" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Download className="size-3.5" /> Export
            </a>
          </>
        }
      />

      <div className="mb-4 flex w-fit gap-1 rounded-xl border border-line bg-panel p-1">
        <Link
          href="/cyber-essentials"
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            tab === "base" ? "bg-brand/15 text-sky-200" : "text-faint hover:text-ink",
          )}
        >
          Cyber Essentials
        </Link>
        <Link
          href="/cyber-essentials?tab=plus"
          className={cn(
            "rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
            tab === "plus" ? "bg-brand/15 text-sky-200" : "text-faint hover:text-ink",
          )}
        >
          CE Plus
        </Link>
      </div>

      {tab === "base" ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.1fr_repeat(3,minmax(0,0.7fr))]">
            <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
              <p className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
                Self-assessment readiness <ShieldCheck className="size-4 text-brand" />
              </p>
              <div className="mt-2 flex items-end gap-2">
                <p className="font-mono text-[32px] leading-none tracking-[-0.04em] text-ink">{percent}%</p>
                <p className="pb-1 text-[10px] text-faint">{met}/{applicable} fully met</p>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-mint" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-faint">
                This is an internal readiness view, not a certification. The assessor will ask for evidence per control.
              </p>
            </div>
            {[
              { label: "Fully met", value: met, tone: "text-emerald-300" },
              { label: "Partly met", value: partial, tone: "text-sky-300" },
              { label: "Evidence attached", value: rows.reduce((sum, row) => sum + row.evidence.length, 0), tone: "text-ink" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{stat.label}</p>
                <p className={cn("mt-2 font-mono text-[30px] leading-none tracking-[-0.04em]", stat.tone)}>{stat.value}</p>
                <p className="mt-1.5 text-[9.5px] text-faint">of five technical controls</p>
              </div>
            ))}
          </div>

          <Card className="mt-4">
            <CardContent className="p-0">
              {rows.map((row) => {
                const state = row.workspaceControls[0];
                const status = state?.status ?? "NOT_STARTED";
                return (
                  <div key={row.id} className="border-b border-line-soft px-4 py-4 last:border-b-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9.5px] text-muted">{row.ref}</span>
                          <p className="text-[12.5px] font-medium text-ink">{row.title}</p>
                          {status === "IMPLEMENTED" ? <Badge tone="mint" dot>Fully met</Badge> : status === "IN_PROGRESS" ? <Badge tone="amber" dot>Partly met</Badge> : null}
                        </div>
                        <p className="mt-1.5 max-w-3xl text-[10.5px] leading-relaxed text-faint">{row.description}</p>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                          <span className="text-faint">Evidence to hold:</span> {EVIDENCE_HINTS[row.ref] ?? "Configuration output and a recent review."}
                        </p>
                        <p className="mt-1 text-[9.5px] text-faint">
                          {row.evidence.length > 0
                            ? `${row.evidence.length} artifact${row.evidence.length === 1 ? "" : "s"} attached · latest ${formatDate(row.evidence[0]?.createdAt)}`
                            : "No evidence attached yet"}
                        </p>
                      </div>
                      <ActionForm action={setCyberEssentialsStatusAction} className="flex flex-wrap gap-1">
                        <input type="hidden" name="controlId" value={row.id} />
                        <input type="hidden" name="tab" value={tab} />
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="submit"
                            name="status"
                            value={option.value}
                            disabled={!writable}
                            className={cn(
                              "h-6 rounded-md border px-2 text-[9.5px] font-medium transition-colors disabled:opacity-50",
                              status === option.value
                                ? option.value === "IMPLEMENTED"
                                  ? "border-mint/40 bg-mint/15 text-emerald-100"
                                  : option.value === "IN_PROGRESS"
                                    ? "border-warning/30 bg-warning/10 text-amber-100"
                                    : option.value === "NOT_APPLICABLE"
                                      ? "border-line bg-raised text-muted"
                                      : "border-danger/30 bg-danger/10 text-red-100"
                                : "border-transparent text-faint hover:border-line hover:text-muted",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </ActionForm>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="max-w-2xl">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-brand/80">
                  <BadgeCheck className="size-3" /> CE Plus assurance
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                  CE Plus is assessed by a certification body and adds five themes to the technical baseline. Prepare evidence per theme,
                  then book the assessment once the base controls and the themes below are operating.
                </p>
              </div>
              <Link href="/controls?framework=cyber-essentials" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Open control record
              </Link>
            </CardContent>
          </Card>
          {PLUS_THEMES.map((theme) => (
            <Card key={theme.title}>
              <CardContent className="p-4">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                  <CheckCircle2 className="size-3.5 text-mint" /> {theme.title}
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">{theme.detail}</p>
                <p className="mt-2 rounded-lg border border-line-soft bg-canvas/40 p-2.5 text-[9.5px] leading-relaxed text-muted">
                  <span className="text-faint">Evidence:</span> {theme.evidence}
                </p>
              </CardContent>
            </Card>
          ))}
          <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/[0.05] p-3 md:col-span-2">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <p className="text-[10px] leading-relaxed text-amber-100/80">
              CE Plus themes are advisory here. Attach the evidence and record the assessment date in your internal audit or management
              review so the certification body sees a maintained trail.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
