import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ControlBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "AI Statement of Applicability" };
export const dynamic = "force-dynamic";

export default async function AiSoaPage() {
  const context = await getWorkspaceContext();
  const framework = await db.framework.findUnique({
    where: { key: "iso_42001" },
    include: {
      controls: {
        orderBy: { sortOrder: "asc" },
        include: { workspaceControls: { where: { workspaceId: context.workspace.id } }, evidence: { where: { workspaceId: context.workspace.id }, select: { id: true } } },
      },
    },
  });
  const controls = framework?.controls ?? [];
  const excluded = controls.filter((control) => control.workspaceControls[0]?.status === "NOT_APPLICABLE");
  const applicable = controls.length - excluded.length;
  const justified = controls.filter((control) => control.workspaceControls[0]?.justification?.trim()).length;
  const implemented = controls.filter((control) => control.workspaceControls[0]?.status === "IMPLEMENTED").length;
  const percent = applicable > 0 ? Math.round((implemented / applicable) * 100) : 0;

  const domains = Array.from(
    controls.reduce((map, control) => {
      const meta = (control.meta ?? {}) as { domain?: string; domainLabel?: string };
      const key = meta.domain ?? control.ref.split(".")[0];
      const entry = map.get(key) ?? { key, label: meta.domainLabel ?? control.category, rows: [] as typeof controls };
      entry.rows.push(control);
      map.set(key, entry);
      return map;
    }, new Map<string, { key: string; label: string; rows: typeof controls }>()),
  ).map(([, domain]) => domain);

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · statement of applicability"
        title="AI SoA"
        description="Which ISO/IEC 42001 Annex A controls apply, why, and what evidence supports each decision. Required before an AI management system audit."
        actions={
          <Link href="/frameworks/iso_42001" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <ClipboardCheck className="size-3.5" /> Edit in control pack
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Controls", value: controls.length, hint: "in the Annex A pack" },
          { label: "Applicable", value: applicable, hint: `${excluded.length} excluded` },
          { label: "Justified", value: justified, hint: "written applicability rationale" },
          { label: "Readiness", value: `${percent}%`, hint: `${implemented} implemented` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{stat.label}</p>
            <p className="mt-2 font-mono text-[27px] leading-none tracking-[-0.04em] text-ink">{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      {justified < controls.length ? (
        <p className="mt-3 rounded-xl border border-warning/20 bg-warning/[0.05] px-3.5 py-2.5 text-[10px] leading-relaxed text-amber-100/85">
          {controls.length - justified} controls have no written applicability justification. An auditor will ask why each one is included or excluded,
          so record the rationale in the control pack.
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel ring-sheen">
        <div className="hidden grid-cols-[90px_minmax(0,1.3fr)_120px_100px_minmax(0,1fr)] gap-3 border-b border-line bg-canvas/30 px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint md:grid">
          <span>Reference</span><span>Control</span><span>Decision</span><span>Status</span><span>Justification</span>
        </div>
        {domains.map((domain) => (
          <section key={domain.key}>
            <div className="flex items-center justify-between border-b border-line-soft bg-canvas/20 px-4 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-sky-200/80">{domain.label} <span className="text-faint">({domain.key})</span></p>
              <span className="font-mono text-[9px] text-faint">{domain.rows.length}</span>
            </div>
            {domain.rows.map((control) => {
              const state = control.workspaceControls[0];
              const excludedRow = state?.status === "NOT_APPLICABLE";
              return (
                <div key={control.id} className="grid gap-2 border-b border-line-soft px-4 py-2.5 last:border-b-0 md:grid-cols-[90px_minmax(0,1.3fr)_120px_100px_minmax(0,1fr)] md:items-start">
                  <span className="w-fit rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9px] text-muted">{control.ref}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-snug text-ink">{control.title}</p>
                    <p className="mt-0.5 text-[9px] text-faint">{control.evidence.length} artifact{control.evidence.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className={cn("text-[9.5px]", excludedRow ? "text-faint" : "text-emerald-300/85")}>{excludedRow ? "Excluded" : "Applicable"}</span>
                  <ControlBadge status={state?.status ?? "NOT_STARTED"} />
                  <p className={cn("text-[9.5px] leading-relaxed", state?.justification ? "text-muted" : "text-faint/70")}>
                    {state?.justification ?? "Not recorded — add a rationale in the control pack."}
                  </p>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <p className="mt-3 flex items-center justify-between text-[9.5px] text-faint">
        <span>Applicability is set from the control status: choosing “Not applicable” excludes the control from readiness.</span>
        <Link href="/aims" className="flex items-center gap-1 text-sky-200/70 hover:text-sky-100">Back to AI management <ArrowUpRight className="size-2.5" /></Link>
      </p>
    </div>
  );
}
