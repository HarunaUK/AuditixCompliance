import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Plus, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RiskStatusBadge, ScoreBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import { formatDate, scoreBand } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "AI risks" };
export const dynamic = "force-dynamic";

export default async function AiRisksPage() {
  const context = await getWorkspaceContext();
  const risks = await db.risk.findMany({
    where: { workspaceId: context.workspace.id, category: { contains: "ai", mode: "insensitive" } },
    include: { owner: { select: { name: true } }, controls: { include: { control: { select: { ref: true, title: true } } } } },
    orderBy: { score: "desc" },
  });
  const open = risks.filter((risk) => risk.status === "OPEN").length;
  const high = risks.filter((risk) => risk.score >= 12).length;
  const treated = risks.filter((risk) => risk.status === "MITIGATED" || risk.status === "CLOSED").length;

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · risk"
        title="AI risks"
        description="Risks from the main register that relate to AI systems. Keep the scenario, score, treatment and control links in one place."
        actions={
          <Link href="/risks/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
            <Plus className="size-3.5" /> New AI risk
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open", value: open, hint: "awaiting treatment" },
          { label: "High or critical", value: high, hint: "score 12 and above" },
          { label: "Treated or closed", value: treated, hint: "with recorded treatment" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-faint">{stat.label}</p>
            <p className="mt-2 font-mono text-[27px] leading-none tracking-[-0.04em] text-ink">{stat.value}</p>
            <p className="mt-1.5 text-[9.5px] text-faint">{stat.hint}</p>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[11.5px] font-medium text-ink">Register</p>
            <Link href="/risks" className="flex items-center gap-1 text-[10px] text-sky-200/75 hover:text-sky-100">All risks <ArrowUpRight className="size-2.5" /></Link>
          </div>
          {risks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ShieldAlert}
                title="No AI risks tagged"
                description="Create a risk with the category set to AI. It will appear here and in the main register, scored on the same matrix."
                action={<Link href="/risks/new" className={buttonVariants({ variant: "secondary", size: "sm" })}>Add an AI risk</Link>}
              />
            </div>
          ) : (
            risks.map((risk) => {
              const band = scoreBand(risk.score);
              return (
                <Link key={risk.id} href={`/risks/${risk.id}`} className="block border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-white/[0.015]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-ink">{risk.title}</p>
                      <p className="mt-0.5 text-[9.5px] text-faint">
                        {risk.owner.name} · L{risk.likelihood}×I{risk.impact} · {risk.treatment.toLowerCase()} · due {formatDate(risk.dueDate, "not set")}
                      </p>
                      {risk.controls.length > 0 ? (
                        <p className="mt-1 flex flex-wrap gap-1 text-[8.5px] text-faint">
                          {risk.controls.slice(0, 4).map((link) => (
                            <span key={link.control.ref} className="rounded border border-line-soft bg-canvas/50 px-1 py-0.5 font-mono">{link.control.ref}</span>
                          ))}
                          {risk.controls.length > 4 ? <span>+{risk.controls.length - 4}</span> : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ScoreBadge score={risk.score} />
                      <RiskStatusBadge status={risk.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <div className={`h-full rounded-full ${band.tone === "critical" ? "bg-danger" : band.tone === "high" ? "bg-warning" : band.tone === "medium" ? "bg-brand" : "bg-mint"}`} style={{ width: `${Math.min(100, (risk.score / 25) * 100)}%` }} />
                    </div>
                    <span className="font-mono text-[8.5px] text-faint">{risk.score}/25</span>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
