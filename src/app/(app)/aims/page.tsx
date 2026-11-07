import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Bot, ClipboardCheck, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { frameworkSummaries } from "@/lib/frameworks";
import { cn, formatDate, scoreBand, titleCase } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "AI management" };
export const dynamic = "force-dynamic";

const TIER_TONE = { PROHIBITED: "red", HIGH: "amber", LIMITED: "brand", MINIMAL: "mint" } as const;

export default async function AiManagementPage() {
  const context = await getWorkspaceContext();
  const [systems, assessments, assessmentCount, risks, summaries] = await Promise.all([
    db.aiSystem.findMany({
      where: { workspaceId: context.workspace.id },
      include: { owner: { select: { name: true } }, _count: { select: { assessments: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.aiImpactAssessment.findMany({
      where: { workspaceId: context.workspace.id },
      include: { system: { select: { name: true, riskTier: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.aiImpactAssessment.count({ where: { workspaceId: context.workspace.id } }),
    db.risk.findMany({
      where: { workspaceId: context.workspace.id, category: { contains: "ai", mode: "insensitive" } },
      include: { owner: { select: { name: true } } },
      orderBy: { score: "desc" },
      take: 6,
    }),
    frameworkSummaries(context.workspace.id),
  ]);

  const pack = summaries.find((summary) => summary.key === "iso_42001");
  const highRisk = systems.filter((system) => system.riskTier === "HIGH" || system.riskTier === "PROHIBITED").length;
  const inProduction = systems.filter((system) => system.lifecycle === "PRODUCTION").length;
  const openRisks = risks.filter((risk) => risk.status === "OPEN" || risk.status === "MONITORING").length;

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · ISO/IEC 42001"
        title="AI management"
        description="One register for every AI system, its risk tier, the impact assessment behind it and the controls that keep it accountable."
        actions={
          <>
            <Link href="/aims/impact" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <ClipboardCheck className="size-3.5" /> Impact assessments
            </Link>
            <Link href="/aims/systems" className={buttonVariants({ variant: "primary", size: "sm" })}>
              <Bot className="size-3.5" /> AI systems
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "AI systems", value: systems.length, hint: `${inProduction} in production`, icon: Bot, tone: "text-ink" },
          { label: "High or prohibited", value: highRisk, hint: "need enhanced assurance", icon: ShieldAlert, tone: highRisk > 0 ? "text-amber-300" : "text-emerald-300" },
          { label: "Impact assessments", value: assessmentCount, hint: "recorded decisions", icon: ClipboardCheck, tone: "text-sky-300" },
          { label: "Open AI risks", value: openRisks, hint: "in the risk register", icon: Sparkles, tone: openRisks > 0 ? "text-amber-300" : "text-emerald-300" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">
              {stat.label} <stat.icon className="size-3.5 text-brand/80" />
            </p>
            <p className={cn("mt-2 font-mono text-[27px] leading-none tracking-[-0.04em]", stat.tone)}>{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-[11.5px] font-medium text-ink">AI system inventory</p>
              <Link href="/aims/systems" className="text-[10px] text-sky-200/75 hover:text-sky-100">Manage <ArrowUpRight className="inline size-2.5" /></Link>
            </div>
            {systems.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Bot} title="No AI systems registered" description="Add the models and AI features you build, buy or embed in a product, then classify each one." action={<Link href="/aims/systems" className={buttonVariants({ variant: "secondary", size: "sm" })}>Add the first system</Link>} />
              </div>
            ) : (
              systems.map((system) => (
                <Link key={system.id} href="/aims/systems" className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-white/[0.015]">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-medium text-ink">{system.name}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-faint">
                      {system.vendor ?? "Internal"} · {system.owner?.name ?? "Unassigned"} · {system._count.assessments} assessment{system._count.assessments === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={TIER_TONE[system.riskTier as keyof typeof TIER_TONE] ?? "neutral"}>{titleCase(system.riskTier)}</Badge>
                    <Badge tone={system.lifecycle === "PRODUCTION" ? "mint" : system.lifecycle === "RETIRED" ? "neutral" : "brand"}>{titleCase(system.lifecycle)}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">ISO/IEC 42001 readiness</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="font-mono text-[30px] leading-none tracking-[-0.04em] text-ink">{pack?.percent ?? 0}%</p>
                <Link href="/frameworks/iso_42001" className={buttonVariants({ variant: "secondary", size: "sm" })}>Open pack</Link>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div className="h-full rounded-full bg-gradient-to-r from-violet to-brand" style={{ width: `${pack?.percent ?? 0}%` }} />
              </div>
              <p className="mt-2 text-[9.5px] text-faint">{pack ? `${pack.total} controls · ${pack.gaps} gaps` : "Framework pack not loaded"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[9.5px]">
                <Link href="/aims/soa" className="rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2 text-muted hover:border-brand/30 hover:text-sky-200">AI SoA</Link>
                <Link href="/aims/governance" className="rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2 text-muted hover:border-brand/30 hover:text-sky-200">Governance</Link>
                <Link href="/aims/risks" className="rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2 text-muted hover:border-brand/30 hover:text-sky-200">AI risks</Link>
                <Link href="/eu/ai-act" className="rounded-lg border border-line-soft bg-canvas/40 px-2.5 py-2 text-muted hover:border-brand/30 hover:text-sky-200">EU AI Act</Link>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">Recent impact assessments</p>
              {assessments.length === 0 ? (
                <p className="mt-2 text-[10px] leading-relaxed text-faint">None recorded yet. Assess each system before it goes live and when its purpose changes.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="text-[10px]">
                      <p className="truncate font-medium text-ink">{assessment.title}</p>
                      <p className="text-faint">{assessment.system.name} · {titleCase(assessment.outcome)} · review {formatDate(assessment.nextReviewAt, "not set")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-3">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[11.5px] font-medium text-ink">AI risks in the register</p>
            <Link href="/aims/risks" className="text-[10px] text-sky-200/75 hover:text-sky-100">View all <ArrowUpRight className="inline size-2.5" /></Link>
          </div>
          {risks.length === 0 ? (
            <p className="px-4 py-5 text-[10.5px] text-faint">
              No risks are categorised as AI yet. When you add one, tag it <span className="font-mono text-muted">AI</span> so it appears here.
            </p>
          ) : (
            risks.map((risk) => {
              const band = scoreBand(risk.score);
              return (
                <Link key={risk.id} href={`/risks/${risk.id}`} className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-2.5 last:border-b-0 hover:bg-white/[0.015]">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-ink">{risk.title}</p>
                    <p className="text-[9px] text-faint">{risk.owner.name} · {titleCase(risk.status)}</p>
                  </div>
                  <Badge tone={band.tone === "critical" ? "red" : band.tone === "high" ? "amber" : band.tone === "medium" ? "brand" : "mint"}>{band.label} · {risk.score}</Badge>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
