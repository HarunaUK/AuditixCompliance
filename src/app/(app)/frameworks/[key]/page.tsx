import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, CheckCheck, Download, Layers3, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { FrameworkControlRow } from "@/components/frameworks/control-row";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { frameworkPack } from "@/lib/frameworks";
import { canWrite } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { toggleIsoEvidenceReuseAction } from "@/actions/frameworks";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const framework = await db.framework.findUnique({ where: { key }, select: { name: true } });
  return { title: framework?.name ?? "Framework" };
}

export default async function FrameworkPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ key }, query, context] = await Promise.all([params, searchParams, getWorkspaceContext()]);
  const pack = await frameworkPack(context.workspace.id, key);
  if (!pack) notFound();

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: context.workspace.id },
    select: { userId: true, user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const writable = canWrite(context.role);
  const meta = (pack.framework.meta ?? {}) as { short?: string; region?: string };
  const shortName = meta.short ?? pack.framework.name;

  return (
    <div>
      <PageHeader
        eyebrow={`Framework pack${meta.region ? ` · ${meta.region}` : ""}`}
        title={shortName}
        description={`${pack.totals.total} controls · statuses mapped to ISO 27001:2022 · ${pack.framework.version}`}
        actions={
          <>
            <Link href={`/api/v1/frameworks/${pack.framework.key}/export`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Download className="size-3.5" /> Export
            </Link>
            <ActionForm action={toggleIsoEvidenceReuseAction}>
              <input type="hidden" name="frameworkKey" value={pack.framework.key} />
              <button
                type="submit"
                disabled={!writable}
                className={buttonVariants({ variant: pack.reuseIsoEvidence ? "brand" : "secondary", size: "sm" })}
                title="Attach evidence from the mapped ISO 27001 controls to this framework"
              >
                <CheckCheck className="size-3.5" /> {pack.reuseIsoEvidence ? "Reusing ISO evidence" : "Reuse ISO evidence"}
              </button>
            </ActionForm>
          </>
        }
      />

      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{query.error}</div>
      ) : null}

      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[268px_minmax(0,1fr)]">
          <div className="flex flex-col justify-between rounded-xl border border-line-soft bg-canvas/40 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                <ShieldCheck className="size-3 text-brand" /> Readiness
              </p>
              <div className="mt-2 flex items-end gap-2.5">
                <p className="font-mono text-[40px] leading-none tracking-[-0.05em] text-ink">{pack.totals.percent}%</p>
                <p className="pb-1 text-[10.5px] text-faint">
                  {pack.totals.gaps} gap{pack.totals.gaps === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-mint transition-[width]"
                  style={{ width: `${pack.totals.percent}%` }}
                />
              </div>
              <p className="mt-2.5 text-[10px] leading-relaxed text-faint">
                {pack.totals.implemented} implemented of {pack.totals.applicable} applicable controls.
              </p>
            </div>
            <div className="mt-4 space-y-1.5 border-t border-line-soft pt-3 text-[10px]">
              <p className="flex items-center justify-between text-faint">
                <span>Total controls</span>
                <span className="font-mono text-muted">{pack.totals.total}</span>
              </p>
              <p className="flex items-center justify-between text-faint">
                <span>ISO evidence reused</span>
                <span className="font-mono text-muted">{pack.isoEvidenceCount}</span>
              </p>
              <p className="flex items-center justify-between text-faint">
                <span>Owners assigned</span>
                <span className="font-mono text-muted">
                  {pack.controls.filter((control) => control.ownerId).length}/{pack.controls.length}
                </span>
              </p>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
              <Layers3 className="size-3 text-brand" /> Control domains
            </p>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {pack.domains.map((domain) => (
                <div key={domain.key} className="rounded-xl border border-line-soft bg-panel/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10.5px] font-medium leading-tight text-ink">
                      {domain.label} <span className="text-faint">({domain.key})</span>
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-faint">{domain.percent}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className={cn("h-full rounded-full", domain.percent === 100 ? "bg-mint" : domain.percent > 0 ? "bg-brand" : "bg-line")}
                      style={{ width: `${domain.percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[9px] text-faint">
                    {domain.implemented}/{domain.total} implemented · {domain.gap} gap{domain.gap === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {pack.domains.map((domain) => (
        <section key={domain.key} className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel ring-sheen">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/85">{domain.label}</span>
              <span className="font-mono text-[9px] text-faint">({domain.key})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9.5px] text-faint">
                {domain.implemented}/{domain.total}
              </span>
              <Badge tone={domain.percent === 100 ? "mint" : domain.percent > 0 ? "brand" : "neutral"}>{domain.percent}%</Badge>
            </div>
          </div>
          {domain.controls.map((control) => (
            <FrameworkControlRow
              key={control.id}
              frameworkKey={pack.framework.key}
              control={control}
              members={members.map((member) => ({ id: member.userId, name: member.user.name }))}
              disabled={!writable}
            />
          ))}
        </section>
      ))}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-faint">
        <p>
          Status changes save immediately and feed{" "}
          <Link href="/readiness" className="text-sky-200/70 hover:text-sky-100">
            Stage 2 readiness
          </Link>
          .
        </p>
        <Link href="/controls" className="flex items-center gap-1 text-sky-200/70 hover:text-sky-100">
          View all framework controls <ArrowUpRight className="size-2.5" />
        </Link>
      </div>
      {!writable ? (
        <p className="mt-3 rounded-lg border border-line bg-panel/50 px-3 py-2 text-[10px] text-faint">
          Your role is read-only. Control changes are disabled.
        </p>
      ) : null}
    </div>
  );
}
