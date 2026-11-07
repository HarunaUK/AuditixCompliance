import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, FileText, Package, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getWorkspaceContext } from "@/lib/workspace";
import { db } from "@/lib/db";
import { REGISTER_COLUMNS, REGISTER_LABELS, type RegisterKey } from "@/lib/services/exports";

export const metadata: Metadata = { title: "Reports & exports" };
export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<RegisterKey, string> = {
  policies: "Every policy with its status, owner, review date, linked controls and full text.",
  risks: "Inherent scoring, treatment, status, owner and open treatment actions.",
  suppliers: "Criticality, DPA status, assurance and the next due-diligence review.",
  incidents: "Severity, containment and resolution dates per incident.",
  actions: "Corrective actions with source, priority, due date and verification.",
  training: "Course completion records by assignee, with due dates.",
  evidence: "Artefacts with checksums, control links and validity dates.",
};

const IMPORTS: RegisterKey[] = ["policies", "risks"];

export default async function ReportsPage() {
  const { workspace } = await getWorkspaceContext();

  const [policies, risks, suppliers, incidents, actions, training, evidence] = await Promise.all([
    db.policy.count({ where: { workspaceId: workspace.id } }),
    db.risk.count({ where: { workspaceId: workspace.id } }),
    db.supplier.count({ where: { workspaceId: workspace.id } }),
    db.incident.count({ where: { workspaceId: workspace.id } }),
    db.correctiveAction.count({ where: { workspaceId: workspace.id } }),
    db.trainingRecord.count({ where: { workspaceId: workspace.id } }),
    db.evidence.count({ where: { workspaceId: workspace.id } }),
  ]);

  const counts: Record<RegisterKey, number> = {
    policies,
    risks,
    suppliers,
    incidents,
    actions,
    training,
    evidence,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Assurance · hand-off"
        title="Reports & exports"
        description="Everything an auditor, client or board needs to see — taken straight from this workspace, not rebuilt by hand. Each file is generated on request so it always reflects the current registers."
      />

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-mint/25 bg-mint/10">
              <Package className="size-4 text-emerald-300" />
            </span>
            <div>
              <p className="text-[12.5px] font-medium text-ink">Auditor package (.zip)</p>
              <p className="mt-1 max-w-[62ch] text-[11.5px] leading-relaxed text-muted">
                Statement of applicability, control status, risk register, evidence index, every policy as Markdown,
                the Stage 2 readiness report and a checksum manifest — the hand-off an external auditor asks for.
              </p>
            </div>
          </div>
          <a href="/api/v1/audit-package" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <Download className="size-3.5" /> Download package
          </a>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Statement of Applicability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[70ch] text-[11.5px] leading-relaxed text-muted">
            Applicability decisions, justifications and implementation status for every control in scope — the single
            document an ISO 27001 auditor opens first.
          </p>
          <a href="/api/soa/export" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <FileSpreadsheet className="size-3.5" /> SoA CSV
          </a>
        </CardContent>
      </Card>

      <h2 className="mt-6 mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Register exports</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(REGISTER_LABELS) as RegisterKey[]).map((key) => (
          <div key={key} className="flex flex-col rounded-xl border border-line bg-panel px-4 py-3.5 ring-sheen">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12px] font-medium text-ink">{REGISTER_LABELS[key]}</p>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted">{counts[key]}</span>
            </div>
            <p className="mt-1 flex-1 text-[11px] leading-relaxed text-faint">{DESCRIPTIONS[key]}</p>
            <p className="mt-2 font-mono text-[9.5px] text-faint/70">{REGISTER_COLUMNS[key].slice(0, 4).join(" · ")}</p>
            <div className="mt-3 flex items-center gap-3">
              <a
                href={`/api/v1/export/${key}`}
                className="inline-flex items-center gap-1 text-[11px] text-sky-300 underline-offset-2 hover:underline"
              >
                <Download className="size-3" /> CSV
              </a>
              {IMPORTS.includes(key) ? (
                <a
                  href={`/api/v1/export/${key}?template=1`}
                  className="inline-flex items-center gap-1 text-[11px] text-muted underline-offset-2 hover:underline"
                  title="Blank sheet with the expected headings"
                >
                  <FileText className="size-3" /> Template
                </a>
              ) : null}
              <Link href={`/${key === "actions" ? "corrective-actions" : key}`} className="ml-auto text-[11px] text-faint hover:text-ink">
                Open register
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-1.5 px-1 text-[10.5px] leading-relaxed text-faint">
        <ShieldCheck className="mt-0.5 size-3 shrink-0" />
        Exports are scoped to {workspace.name} and permission-checked per request; every import is written to the audit
        trail with the person who performed it.
      </p>
    </div>
  );
}
