import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate, titleCase } from "@/lib/utils";
import { createAiAssessmentAction, deleteAiAssessmentAction } from "@/actions/ai";

export const metadata: Metadata = { title: "AI impact assessments" };
export const dynamic = "force-dynamic";

const OUTCOME_TONE: Record<string, BadgeProps["tone"]> = {
  APPROVED: "mint",
  CONDITIONAL: "amber",
  REJECTED: "red",
  DEFERRED: "neutral",
};

const SCORES = [
  { value: 1, label: "1 · Negligible" },
  { value: 2, label: "2 · Minor" },
  { value: 3, label: "3 · Moderate" },
  { value: 4, label: "4 · Major" },
  { value: 5, label: "5 · Severe" },
];

export default async function AiImpactPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const [systems, assessments] = await Promise.all([
    db.aiSystem.findMany({
      where: { workspaceId: context.workspace.id, lifecycle: { not: "RETIRED" } },
      select: { id: true, name: true, riskTier: true },
      orderBy: { name: "asc" },
    }),
    db.aiImpactAssessment.findMany({
      where: { workspaceId: context.workspace.id },
      include: { system: { select: { id: true, name: true, riskTier: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const writable = canWrite(context.role);
  const due = assessments.filter((row) => !row.nextReviewAt || row.nextReviewAt.getTime() < Date.now()).length;

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · impact"
        title="Impact assessments"
        description="Record how each AI system affects people, groups and society — and the decision that followed. ISO 42001 A.5 and the EU AI Act both expect this trail."
        actions={
          <Link href="/aims/systems" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-raised px-3 text-[12px] text-ink">
            <ClipboardCheck className="size-3.5" /> Manage systems
          </Link>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{error}</div> : null}

      {systems.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={ClipboardCheck}
              title="Register a system first"
              description="An impact assessment belongs to an AI system. Add the system to the inventory, then record the assessment here."
              action={<Link href="/aims/systems" className="inline-flex h-8 items-center rounded-lg border border-blue-500/40 bg-brand-strong px-3 text-[12px] font-medium text-white">Add an AI system</Link>}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card id="add-assessment">
            <details open={assessments.length === 0}>
              <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2"><Plus className="size-3.5 text-brand" /> Record an impact assessment</span>
                <span className="text-[10px] text-faint">{assessments.length} on file · {due} due for review</span>
              </summary>
              <CardContent className="border-t border-line-soft pt-4">
                {writable ? (
                  <form action={createAiAssessmentAction} className="grid gap-x-4 md:grid-cols-3">
                    <Field label="AI system" htmlFor="systemId">
                      <Select id="systemId" name="systemId" required defaultValue={systems[0]?.id}>
                        {systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
                      </Select>
                    </Field>
                    <Field label="Assessment title" className="md:col-span-2">
                      <Input name="title" required placeholder="Initial deployment assessment — Support Copilot" maxLength={160} />
                    </Field>
                    <Field label="Scope" className="md:col-span-3">
                      <Textarea name="scope" rows={2} placeholder="Which use case, users, data and geographies are in scope?" maxLength={1500} />
                    </Field>
                    <Field label="Findings" className="md:col-span-3">
                      <Textarea name="findings" rows={3} placeholder="What could go wrong, who is affected, and what did you verify?" maxLength={4000} />
                    </Field>
                    <Field label="Impact on individuals">
                      <Select name="individualsImpact" defaultValue="3">
                        {SCORES.map((score) => <option key={score.value} value={score.value}>{score.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Societal impact">
                      <Select name="societalImpact" defaultValue="3">
                        {SCORES.map((score) => <option key={score.value} value={score.value}>{score.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Decision">
                      <Select name="outcome" defaultValue="APPROVED">
                        <option value="APPROVED">Approved</option>
                        <option value="CONDITIONAL">Approved with conditions</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="DEFERRED">Deferred</option>
                      </Select>
                    </Field>
                    <Field label="Mitigations" className="md:col-span-2">
                      <Textarea name="mitigations" rows={2} placeholder="Oversight, filters, monitoring, user notice" maxLength={2000} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Approved">
                        <Input name="approvedAt" type="date" className="[color-scheme:dark]" />
                      </Field>
                      <Field label="Next review">
                        <Input name="nextReviewAt" type="date" className="[color-scheme:dark]" />
                      </Field>
                    </div>
                    <div className="md:col-span-3">
                      <Button type="submit" variant="primary" size="sm">Save assessment</Button>
                    </div>
                  </form>
                ) : <p className="text-[11px] text-faint">Your role is read-only.</p>}
              </CardContent>
            </details>
          </Card>

          <div className="mt-4 space-y-3">
            {assessments.length === 0 ? (
              <Card><CardContent className="p-4"><EmptyState icon={ClipboardCheck} title="No assessments recorded" description="Assess each system before go-live and whenever its purpose or model changes." /></CardContent></Card>
            ) : (
              assessments.map((row) => (
                <Card key={row.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[12px] font-medium text-ink">{row.title}</p>
                          <Badge tone={OUTCOME_TONE[row.outcome] ?? "neutral"} dot>{titleCase(row.outcome)}</Badge>
                        </div>
                        <p className="mt-0.5 text-[9.5px] text-faint">
                          {row.system.name} · individuals {row.individualsImpact}/5 · society {row.societalImpact}/5 · approved {formatDate(row.approvedAt, "not recorded")} · review {formatDate(row.nextReviewAt, "not set")}
                        </p>
                      </div>
                      {writable ? <DeleteButton action={deleteAiAssessmentAction} id={row.id} label={`Delete ${row.title}`} /> : null}
                    </div>
                    {row.scope ? <p className="mt-2 text-[10px] leading-relaxed text-muted"><span className="text-faint">Scope:</span> {row.scope}</p> : null}
                    {row.findings ? <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-faint">{row.findings}</p> : null}
                    {row.mitigations ? <p className="mt-1 text-[10px] leading-relaxed text-muted"><span className="text-faint">Mitigations:</span> {row.mitigations}</p> : null}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
