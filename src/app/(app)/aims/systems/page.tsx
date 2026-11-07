import type { Metadata } from "next";
import { Bot, Plus, ShieldAlert, UserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { db } from "@/lib/db";
import { canWrite } from "@/lib/rbac";
import { getWorkspaceContext } from "@/lib/workspace";
import { cn, formatDate, titleCase } from "@/lib/utils";
import { createAiSystemAction, deleteAiSystemAction, updateAiSystemAction } from "@/actions/ai";

export const metadata: Metadata = { title: "AI systems" };
export const dynamic = "force-dynamic";

const TIER_TONE = { PROHIBITED: "red", HIGH: "amber", LIMITED: "brand", MINIMAL: "mint" } as const;
const MODEL_TYPES = ["Foundation model", "Fine-tuned model", "Classical ML", "Rules-based", "Third-party API", "Agent"];

export default async function AiSystemsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const [systems, members] = await Promise.all([
    db.aiSystem.findMany({
      where: { workspaceId: context.workspace.id },
      include: { owner: { select: { name: true } }, _count: { select: { assessments: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const writable = canWrite(context.role);
  const highRisk = systems.filter((system) => system.riskTier === "HIGH" || system.riskTier === "PROHIBITED").length;
  const unassessed = systems.filter((system) => system._count.assessments === 0).length;
  const unowned = systems.filter((system) => !system.ownerId).length;

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · inventory"
        title="AI systems"
        description="Every model, API or AI feature you operate. Classify the risk tier first: it determines the assurance the system needs."
        actions={
          <a href="#add-ai-system" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-brand-strong px-3 text-[12px] font-medium text-white">
            <Plus className="size-3.5" /> Add system
          </a>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Systems", value: systems.length, hint: "in the inventory", icon: Bot, tone: "text-ink" },
          { label: "High or prohibited", value: highRisk, hint: "enhanced assurance", icon: ShieldAlert, tone: highRisk > 0 ? "text-amber-300" : "text-emerald-300" },
          { label: "No impact assessment", value: unassessed, hint: "assessment missing", icon: ShieldAlert, tone: unassessed > 0 ? "text-red-300" : "text-emerald-300" },
          { label: "Unowned", value: unowned, hint: "need accountability", icon: UserRound, tone: unowned > 0 ? "text-amber-300" : "text-emerald-300" },
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

      <Card className="mt-4" id="add-ai-system">
        <details open={systems.length === 0}>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Plus className="size-3.5 text-brand" /> Register an AI system</span>
            <span className="text-[10px] text-faint">Purpose, tier, lifecycle and oversight</span>
          </summary>
          <CardContent className="border-t border-line-soft pt-4">
            {writable ? (
              <form action={createAiSystemAction} className="grid gap-x-4 md:grid-cols-3">
                <Field label="System name" htmlFor="name">
                  <Input id="name" name="name" required placeholder="Support Copilot" maxLength={140} />
                </Field>
                <Field label="Vendor or provider">
                  <Input name="vendor" placeholder="Internal / OpenAI / Azure" maxLength={120} />
                </Field>
                <Field label="Owner">
                  <Select name="ownerId" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}
                  </Select>
                </Field>
                <Field label="Model type">
                  <Select name="modelType" defaultValue="Foundation model">
                    {MODEL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </Select>
                </Field>
                <Field label="Risk tier">
                  <Select name="riskTier" defaultValue="LIMITED">
                    <option value="PROHIBITED">Prohibited</option>
                    <option value="HIGH">High</option>
                    <option value="LIMITED">Limited</option>
                    <option value="MINIMAL">Minimal</option>
                  </Select>
                </Field>
                <Field label="Lifecycle">
                  <Select name="lifecycle" defaultValue="PILOT">
                    <option value="PILOT">Pilot</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="RETIRED">Retired</option>
                  </Select>
                </Field>
                <Field label="Data involved">
                  <Input name="dataTypes" placeholder="Customer tickets, account metadata" maxLength={160} />
                </Field>
                <Field label="Next review">
                  <Input name="nextReviewAt" type="date" className="[color-scheme:dark]" />
                </Field>
                <div className="md:col-span-3">
                  <p className="mb-4 grid gap-4 md:grid-cols-2">
                    <span>
                      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">Purpose and intended use</span>
                      <Textarea name="purpose" rows={2} placeholder="Drafts replies to customer support tickets for human review" maxLength={1000} />
                    </span>
                    <span>
                      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">Human oversight</span>
                      <Textarea name="humanOversight" rows={2} placeholder="Agent reviews and edits every reply before sending" maxLength={1000} />
                    </span>
                  </p>
                </div>
                <div className="md:col-span-3">
                  <Button type="submit" variant="primary" size="sm">Add to inventory</Button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-faint">Your role is read-only.</p>
            )}
          </CardContent>
        </details>
      </Card>

      <Card className="mt-3">
        <CardContent className="p-0">
          {systems.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Bot} title="No AI systems registered" description="Add each model or AI feature, including third-party APIs embedded in your product." />
            </div>
          ) : (
            systems.map((system) => (
              <div key={system.id} className="border-b border-line-soft px-4 py-3.5 last:border-b-0 hover:bg-white/[0.015]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-medium text-ink">{system.name}</p>
                      <Badge tone={TIER_TONE[system.riskTier as keyof typeof TIER_TONE] ?? "neutral"} dot>{titleCase(system.riskTier)}</Badge>
                      <Badge tone={system.lifecycle === "PRODUCTION" ? "mint" : system.lifecycle === "RETIRED" ? "neutral" : "brand"}>{titleCase(system.lifecycle)}</Badge>
                    </div>
                    <p className="mt-0.5 text-[9.5px] text-faint">
                      {system.vendor ?? "Internal"} · {system.modelType} · {system.owner?.name ?? "Unassigned"} · review {formatDate(system.nextReviewAt, "not set")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-faint">{system._count.assessments} assessment{system._count.assessments === 1 ? "" : "s"}</span>
                    {writable ? <DeleteButton action={deleteAiSystemAction} id={system.id} label={`Delete ${system.name}`} /> : null}
                  </div>
                </div>
                {system.purpose ? <p className="mt-1.5 line-clamp-2 max-w-3xl text-[10px] leading-relaxed text-faint">{system.purpose}</p> : null}
                {writable ? (
                  <form action={updateAiSystemAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={system.id} />
                    <label className="text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">
                      Tier
                      <Select name="riskTier" defaultValue={system.riskTier} className="mt-1 h-7 w-[110px] text-[10px]">
                        <option value="PROHIBITED">Prohibited</option>
                        <option value="HIGH">High</option>
                        <option value="LIMITED">Limited</option>
                        <option value="MINIMAL">Minimal</option>
                      </Select>
                    </label>
                    <label className="text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">
                      Lifecycle
                      <Select name="lifecycle" defaultValue={system.lifecycle} className="mt-1 h-7 w-[105px] text-[10px]">
                        <option value="PILOT">Pilot</option>
                        <option value="PRODUCTION">Production</option>
                        <option value="RETIRED">Retired</option>
                      </Select>
                    </label>
                    <label className="text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">
                      Owner
                      <Select name="ownerId" defaultValue={system.ownerId ?? ""} className="mt-1 h-7 w-[125px] text-[10px]">
                        <option value="">Unassigned</option>
                        {members.map((member) => <option key={member.userId} value={member.userId}>{member.user.name}</option>)}
                      </Select>
                    </label>
                    <label className="text-[8px] font-semibold uppercase tracking-[0.1em] text-faint">
                      Review
                      <Input name="nextReviewAt" type="date" defaultValue={system.nextReviewAt ? system.nextReviewAt.toISOString().slice(0, 10) : ""} className="mt-1 h-7 w-[120px] text-[10px] [color-scheme:dark]" />
                    </label>
                    <Button type="submit" variant="secondary" size="sm" className="h-7 px-2 text-[10px]">Save</Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
