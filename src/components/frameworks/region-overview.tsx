import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, CheckCircle2, Landmark, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import { frameworkSummaries } from "@/lib/frameworks";

type PackLink = { key: string; label: string; note: string };

export async function RegionOverview({
  eyebrow,
  title,
  description,
  intro,
  facts,
  sections,
  packs,
}: {
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  facts: { label: string; value: string; hint?: string }[];
  sections: { title: string; body: string; points: string[] }[];
  packs: PackLink[];
}) {
  const context = await getWorkspaceContext();
  const summaries = await frameworkSummaries(context.workspace.id);
  const byKey = new Map(summaries.map((summary) => [summary.key, summary]));

  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={<Link href="/readiness" className={buttonVariants({ variant: "secondary", size: "sm" })}>Stage 2 readiness <ArrowUpRight className="size-3.5" /></Link>} />

      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">
              <Landmark className="size-3" /> Regulatory context
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{intro}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-line-soft bg-canvas/40 p-3">
                  <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint">{fact.label}</p>
                  <p className="mt-1 text-[15px] font-medium tracking-[-0.01em] text-ink">{fact.value}</p>
                  {fact.hint ? <p className="mt-0.5 text-[9px] leading-snug text-faint">{fact.hint}</p> : null}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">
              <ShieldCheck className="size-3" /> Your readiness
            </p>
            <div className="mt-2.5 space-y-2">
              {packs.map((pack) => {
                const summary = byKey.get(pack.key);
                return (
                  <Link
                    key={pack.key}
                    href={`/frameworks/${pack.key}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-panel/70 px-3.5 py-3 transition-colors hover:border-brand/30 hover:bg-brand/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium text-ink">{pack.label}</p>
                      <p className="mt-0.5 truncate text-[9.5px] text-faint">{pack.note}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[14px] text-ink">{summary ? `${summary.percent}%` : "—"}</p>
                      <p className="text-[8.5px] text-faint">{summary ? `${summary.total} controls` : "pack pending"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            {packs[0] ? (
              <Link
                href={`/frameworks/${packs[0].key}`}
                className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-3 w-full")}
              >
                Work the controls <ArrowUpRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">
                <BookOpenCheck className="size-3 text-brand" /> {section.title}
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{section.body}</p>
              <ul className="mt-3 space-y-1.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2 text-[10.5px] leading-relaxed text-faint">
                    <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-mint/70" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-4 rounded-xl border border-line bg-panel/50 px-3.5 py-2.5 text-[9.5px] leading-relaxed text-faint">
        Overview pages summarise obligations and link to the control packs already enabled in this workspace. They are not legal advice; confirm scope with your auditor or counsel.
      </p>
    </div>
  );
}
