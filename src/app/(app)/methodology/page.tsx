import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, SlidersHorizontal, Target } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { methodologyCompleteness } from "@/lib/services/isms";
import { saveMethodologyAction } from "@/actions/isms";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Risk methodology" };
export const dynamic = "force-dynamic";

export default async function MethodologyPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const workspace = await db.workspace.findUnique({
    where: { id: context.workspace.id },
    select: {
      methodologyProcess: true,
      methodologyLikelihood: true,
      methodologyImpact: true,
      acceptanceCriteria: true,
      methodologyReviewFrequency: true,
      methodologyUpdatedAt: true,
    },
  });
  if (!workspace) return null;

  const completeness = methodologyCompleteness(workspace);
  const writable = canWrite(context.role);

  return (
    <div>
      <PageHeader
        eyebrow="Risk management · Clause 6.1.2"
        title="Risk assessment methodology"
        description="How risks are identified, analysed and evaluated, the scales used, who accepts residual risk, and when the methodology is reviewed. The register is only as defensible as this document."
        actions={
          <>
            <Link href="/risks" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Risk register
            </Link>
            <Link href="/stage-1" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Stage 1 check <ArrowRight className="size-3.5" />
            </Link>
          </>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Risk methodology saved.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Documented methodology</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">
                {workspace.methodologyUpdatedAt
                  ? `Last updated ${formatDateTime(workspace.methodologyUpdatedAt)}`
                  : "Not yet documented — this is a Stage 1 prerequisite."}
              </p>
            </div>
            <Badge tone={completeness === 100 ? "mint" : completeness >= 40 ? "amber" : "neutral"}>{completeness}% complete</Badge>
          </CardHeader>
          <CardContent>
            <form action={saveMethodologyAction}>
              <Field
                label="Assessment process"
                htmlFor="process"
                hint="How risks are identified, analysed, evaluated, treated and monitored, and who is involved."
              >
                <Textarea
                  id="process"
                  name="process"
                  rows={5}
                  defaultValue={workspace.methodologyProcess ?? ""}
                  placeholder="Risks are identified from the asset inventory, threat intelligence, incidents, supplier reviews and change activity. Each risk is scored on likelihood and impact, evaluated against the acceptance criteria, assigned an owner, and linked to Annex A controls and treatment actions. The register is reviewed quarterly and on significant change."
                  required
                />
              </Field>

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Likelihood scale" htmlFor="likelihood" hint="Define each point so two assessors score consistently.">
                  <Textarea
                    id="likelihood"
                    name="likelihood"
                    rows={5}
                    defaultValue={workspace.methodologyLikelihood ?? ""}
                    placeholder={"1 Rare — not expected in 10 years\n2 Unlikely — once in 3–10 years\n3 Possible — once in 1–3 years\n4 Likely — once a year\n5 Almost certain — more than once a year"}
                    required
                  />
                </Field>
                <Field label="Impact scale" htmlFor="impact" hint="Use financial, operational, legal and reputational consequences.">
                  <Textarea
                    id="impact"
                    name="impact"
                    rows={5}
                    defaultValue={workspace.methodologyImpact ?? ""}
                    placeholder={"1 Negligible — no material effect\n2 Minor — local, contained\n3 Moderate — service disruption or regulatory attention\n4 Major — significant loss or breach\n5 Severe — existential or multi-tenant impact"}
                    required
                  />
                </Field>
              </div>

              <Field
                label="Risk acceptance criteria"
                htmlFor="acceptance"
                hint="When a risk is acceptable, who signs off, and what evidence is retained."
              >
                <Textarea
                  id="acceptance"
                  name="acceptance"
                  rows={4}
                  defaultValue={workspace.acceptanceCriteria ?? ""}
                  placeholder="Residual risks scoring 5 or below are accepted by the risk owner. Scores from 6–11 require Head of Security approval. Scores of 12 or above require executive sign-off and a treatment plan. Accepted risks are recorded in the register with the approver and review date."
                  required
                />
              </Field>

              <Field label="Review frequency" htmlFor="reviewFrequency" className="mb-0">
                <Input
                  id="reviewFrequency"
                  name="reviewFrequency"
                  defaultValue={workspace.methodologyReviewFrequency ?? ""}
                  placeholder="Annually, quarterly, and on significant change"
                  required
                />
              </Field>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
                <p className="max-w-md text-[9.5px] leading-relaxed text-faint">
                  This text is stored with the workspace and written to the audit trail. The Stage 1 gate checks all five fields.
                </p>
                <SubmitButton variant="primary" pendingText="Saving…" disabled={!writable}>
                  Save methodology
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-brand/20 bg-[linear-gradient(155deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_58%)] p-5 ring-sheen">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              <SlidersHorizontal className="size-3.5" /> Why auditors ask
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              Clause 6.1.2 requires a repeatable process, defined risk criteria and criteria for accepting residual risk. A
              register without it is a list of opinions.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line/60 pt-4">
              <div>
                <p className="font-mono text-[19px] leading-none text-ink">5×5</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-faint">Register scale</p>
              </div>
              <div>
                <p className="font-mono text-[19px] leading-none text-ink">{completeness}%</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-faint">Documented</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Criteria in this workspace</CardTitle>
              <Target className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-[10.5px] leading-relaxed">
              <div className="flex items-center justify-between gap-2">
                <span className="text-faint">Low</span>
                <span className="font-mono text-[10px] text-emerald-200">1–5</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-faint">Medium</span>
                <span className="font-mono text-[10px] text-sky-200">6–11</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-faint">High</span>
                <span className="font-mono text-[10px] text-amber-200">12–19</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-faint">Critical</span>
                <span className="font-mono text-[10px] text-red-200">20–25</span>
              </div>
              <p className="border-t border-line-soft pt-3 text-[9.5px] text-faint">
                The register uses likelihood × impact. If your methodology differs, say so above before an assessor applies it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
