import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Database, Layers, Sparkles, Target } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ProgressRing } from "@/components/ui/progress-ring";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { getProfile, profileCompleteness } from "@/lib/services/isms";
import { saveProfileAction } from "@/actions/isms";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

const benefits = [
  { icon: Sparkles, title: "Scope statement", detail: "A Clause 4.3 draft built from your actual environment, ready to review." },
  { icon: Target, title: "Stage 1 evidence", detail: "The intake feeds the organisation checks in the computed Stage 1 gate." },
  { icon: Layers, title: "ISMS context", detail: "Interested parties, obligations and dependencies captured in one place." },
];

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const profile = await getProfile(context.workspace.id);
  const completeness = profileCompleteness(profile);
  const writable = canWrite(context.role);

  return (
    <div>
      <PageHeader
        eyebrow="ISMS setup · Clauses 4.1–4.3"
        title="Organisation intake"
        description={`Tell Auditix how ${context.workspace.name} actually operates. The intake drives the scope draft, the risk context and the Stage 1 gate — it is not a marketing questionnaire.`}
        actions={
          <Link href="/stage-1" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Stage 1 check <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Organisation profile saved.
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
              <CardTitle>Organisation profile</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">
                Everything is optional except the organisation name. More detail makes the generated scope sharper.
              </p>
            </div>
            <Badge tone={completeness === 100 ? "mint" : "brand"}>{completeness}% complete</Badge>
          </CardHeader>
          <CardContent>
            <form action={saveProfileAction}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company name *" htmlFor="companyName">
                  <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={profile?.companyName ?? context.workspace.name}
                    placeholder="e.g. Acme Ltd"
                    required
                  />
                </Field>
                <Field label="Industry" htmlFor="industry">
                  <Input id="industry" name="industry" defaultValue={profile?.industry ?? ""} placeholder="e.g. B2B SaaS, FinTech, Healthcare" />
                </Field>
                <Field label="Headcount" htmlFor="headcount">
                  <Input
                    id="headcount"
                    name="headcount"
                    type="number"
                    min={1}
                    max={1_000_000}
                    defaultValue={profile?.headcount ?? ""}
                    placeholder="e.g. 15"
                  />
                </Field>
                <Field label="Primary geography" htmlFor="geography">
                  <Input id="geography" name="geography" defaultValue={profile?.geography ?? ""} placeholder="e.g. UK, EU, US" />
                </Field>
              </div>

              <div className="mb-2 mt-2 flex items-center gap-2 border-t border-line-soft pt-4">
                <Database className="size-3.5 text-brand" />
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">Data and environment</p>
              </div>

              <Field
                label="Data types processed"
                htmlFor="dataTypes"
                hint="Comma-separated — what sensitive data do you store or process?"
              >
                <Input
                  id="dataTypes"
                  name="dataTypes"
                  defaultValue={profile?.dataTypes ?? ""}
                  placeholder="e.g. Customer PII, Financial Records, Health Data"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cloud / hosting providers" htmlFor="cloudProviders">
                  <Input
                    id="cloudProviders"
                    name="cloudProviders"
                    defaultValue={profile?.cloudProviders ?? ""}
                    placeholder="e.g. AWS, Azure, GCP"
                  />
                </Field>
                <Field label="SaaS tools used" htmlFor="saasTools">
                  <Input id="saasTools" name="saasTools" defaultValue={profile?.saasTools ?? ""} placeholder="e.g. GitHub, Slack, Jira" />
                </Field>
              </div>
              <Field
                label="Key systems / applications"
                htmlFor="keySystems"
                hint="Comma-separated — systems in scope for your ISMS."
                className="mb-0"
              >
                <Input
                  id="keySystems"
                  name="keySystems"
                  defaultValue={profile?.keySystems ?? ""}
                  placeholder="e.g. Customer portal, Internal CRM, Payment gateway"
                />
              </Field>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
                <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Skip for now
                </Link>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton name="intent" value="save" variant="secondary" pendingText="Saving…">
                    Save profile
                  </SubmitButton>
                  <SubmitButton name="intent" value="generate" variant="primary" pendingText="Generating…">
                    <Sparkles className="size-3.5" /> Save & draft scope
                  </SubmitButton>
                </div>
              </div>
              {!writable ? (
                <p className="mt-2 text-[10px] text-faint">Your role is read-only, so these fields cannot be submitted.</p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-brand/20 bg-[linear-gradient(155deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_58%)] p-5 ring-sheen">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200">
              <Building2 className="size-3.5" /> Intake completeness
            </div>
            <div className="mt-4 flex items-center gap-4">
              <ProgressRing value={completeness} size={92} stroke={7} />
              <p className="text-[11.5px] leading-relaxed text-muted">
                {completeness === 100
                  ? "Every intake field is populated. Regenerate the scope if the environment has changed."
                  : "Fill the remaining fields so the scope and risk context describe the real environment."}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What this unlocks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-raised text-brand">
                    <benefit.icon className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-[11.5px] font-medium text-ink">{benefit.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-faint">{benefit.detail}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-line-soft pt-3">
                <Link href="/context" className="flex items-center justify-between text-[10.5px] text-sky-200 hover:text-sky-100">
                  Continue to context & parties <ArrowRight className="size-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
