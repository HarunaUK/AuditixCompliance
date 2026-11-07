import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Globe, ListChecks, ScrollText, Scale, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "EU compliance" };
export const dynamic = "force-dynamic";

const FRAMEWORK_COPY: Record<string, { title: string; subtitle: string; description: string }> = {
  gdpr: {
    title: "GDPR (EU & UK)",
    subtitle: "European Union / UK ICO",
    description:
      "EU General Data Protection Regulation (Reg. (EU) 2016/679) and the UK GDPR with the Data Protection Act 2018, as amended by the Data (Use and Access) Act 2025. Covers every article that places obligations on organisations (scope, principles, rights, controller/processor duties, transfers, remedies, specific situations, ePrivacy/PECR), plus UK-specific duties. Institutional articles (supervisory-authority powers, EDPB, delegated acts) are not organisation controls and are not listed. Mark UK controls 'not applicable' if you have no UK establishment or UK data subjects. GDPR is a legal obligation — there is no 'GDPR certificate'; this tracks readiness, not legal advice.",
  },
  nis2: {
    title: "NIS2 Directive",
    subtitle: "European Union",
    description:
      "EU NIS2 Directive (EU) 2022/2555 — organisation-facing obligations for essential and important entities: governance/accountability (Art. 20), the ten risk-management measures (Art. 21(2) a-j), the multi-stage incident reporting regime (Art. 23), and registration (Art. 3/27). The rest of the Directive (CSIRTs, cooperation group, national supervision/enforcement) is institutional and not listed as organisation controls. Transposed into national law by each Member State; not legal advice.",
  },
};

export default async function EuOverviewPage() {
  const context = await getWorkspaceContext();
  const frameworks = await db.framework.findMany({
    where: { key: { in: ["gdpr", "nis2"] } },
    include: {
      controls: {
        select: { id: true, workspaceControls: { where: { workspaceId: context.workspace.id }, select: { id: true } } },
      },
    },
  });

  const rows = ["gdpr", "nis2"].flatMap((key) => {
    const framework = frameworks.find((item) => item.key === key);
    if (!framework) return [];
    const copy = FRAMEWORK_COPY[key];
    const adopted = framework.controls.some((control) => control.workspaceControls.length > 0);
    return [
      {
        key,
        title: copy.title,
        subtitle: `${copy.subtitle} · ${framework.controls.length} controls`,
        description: copy.description,
        adopted,
      },
    ];
  });

  return (
    <div>
      <PageHeader
        eyebrow="Europe"
        title="EU Compliance"
        description="GDPR, NIS2 and the EU AI Act — a self-contained module for European clients."
        actions={
          <Badge tone="brand">
            <Globe className="size-3" /> Europe
          </Badge>
        }
      />

      <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-faint">Frameworks</p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.key} className="flex">
            <CardContent className="flex w-full flex-col p-4">
              <div className="mb-3 flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-lg border border-brand/20 bg-brand/[0.08] text-sky-300">
                  <ListChecks className="size-4" />
                </span>
                {row.adopted ? <CheckCircle2 className="size-4 text-mint" /> : null}
              </div>
              <p className="text-[14px] font-semibold text-ink">{row.title}</p>
              <p className="mt-0.5 text-[10.5px] text-faint">{row.subtitle}</p>
              <p className="mt-2.5 flex-1 text-[10.5px] leading-relaxed text-muted">{row.description}</p>
              <Link
                href={`/frameworks/${row.key}`}
                className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4 w-full" })}
              >
                Open <ArrowRight className="size-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mb-2 mt-6 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-faint">Tools</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col p-4">
            <span className="mb-3 grid size-9 place-items-center rounded-lg border border-line bg-raised text-muted">
              <Scale className="size-4" />
            </span>
            <p className="text-[13px] font-semibold text-ink">GDPR data-subject rights</p>
            <p className="mt-1 flex-1 text-[10.5px] leading-relaxed text-faint">
              Data portability (Art. 20) and right to erasure (Art. 17).
            </p>
            <Link href="/eu/gdpr" className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4 w-full" })}>
              Open <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col p-4">
            <span className="mb-3 grid size-9 place-items-center rounded-lg border border-line bg-raised text-muted">
              <Sparkles className="size-4" />
            </span>
            <p className="text-[13px] font-semibold text-ink">EU AI Act</p>
            <p className="mt-1 flex-1 text-[10.5px] leading-relaxed text-faint">
              AI system risk classification — in your AI Governance module.
            </p>
            <Link
              href="/aims/eu-ai-act"
              className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-4 w-full" })}
            >
              Open <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-panel p-3">
        <ScrollText className="mt-0.5 size-3.5 shrink-0 text-faint" />
        <p className="text-[10px] leading-relaxed text-faint">
          GDPR, NIS2 and the AI Act overlap in practice. One evidence set — data maps, supplier terms, incident records and AI impact
          assessments — can support all three, so map regional requirements to your ISO 27001 controls rather than running parallel
          programmes.
        </p>
      </div>
    </div>
  );
}
