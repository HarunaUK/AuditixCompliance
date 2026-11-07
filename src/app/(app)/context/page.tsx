import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2, Network, Plus, ShieldQuestion, Trash2, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { db } from "@/lib/db";
import { createContextItemAction, deleteContextItemAction } from "@/actions/isms";
import type { ContextType } from "@prisma/client";

export const metadata: Metadata = { title: "Context & interested parties" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<ContextType, string> = {
  INTERNAL: "Internal issue",
  EXTERNAL: "External issue",
  PARTY: "Interested party",
};

const TYPE_TONE: Record<ContextType, "brand" | "amber" | "violet"> = {
  INTERNAL: "brand",
  EXTERNAL: "amber",
  PARTY: "violet",
};

const TYPE_ICON = {
  INTERNAL: Building2,
  EXTERNAL: Network,
  PARTY: UsersRound,
} as const;

export default async function ContextPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const query = await searchParams;
  const context = await getWorkspaceContext();
  const writable = canWrite(context.role);
  const items = await db.contextItem.findMany({
    where: { workspaceId: context.workspace.id },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });

  const counts = {
    INTERNAL: items.filter((item) => item.type === "INTERNAL").length,
    EXTERNAL: items.filter((item) => item.type === "EXTERNAL").length,
    PARTY: items.filter((item) => item.type === "PARTY").length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="ISMS context · Clauses 4.1 & 4.2"
        title="Context & interested parties"
        description="The internal and external issues that shape the ISMS, and the parties whose requirements it must satisfy. This is the reasoning behind the scope and the risk criteria."
        actions={
          <Link href="/stage-1" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Stage 1 check
          </Link>
        }
      />

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> Context item added.
        </div>
      ) : null}
      {query.deleted ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[11.5px] text-muted">
          <Trash2 className="size-3.5" /> Context item removed.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {query.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Internal issues", value: counts.INTERNAL, tone: "text-sky-200" },
          { label: "External issues", value: counts.EXTERNAL, tone: "text-amber-200" },
          { label: "Interested parties", value: counts.PARTY, tone: "text-indigo-200" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className={`mt-1.5 font-mono text-[23px] leading-none ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>ISMS context register</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Clauses 4.1 and 4.2 require this to be determined and maintained.</p>
            </div>
            <Badge tone="outline">{items.length} items</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {items.length ? (
              <div className="divide-y divide-line-soft">
                {items.map((item) => {
                  const Icon = TYPE_ICON[item.type];
                  return (
                    <div key={item.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-brand">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={TYPE_TONE[item.type]}>{TYPE_LABEL[item.type]}</Badge>
                          {item.party ? <span className="text-[11.5px] font-medium text-ink">{item.party}</span> : null}
                        </div>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-300">{item.description}</p>
                        {item.needs ? (
                          <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
                            <span className="font-medium text-muted">Needs & expectations: </span>
                            {item.needs}
                          </p>
                        ) : null}
                        {item.relevance ? (
                          <p className="mt-1 text-[10px] leading-relaxed text-faint">
                            <span className="font-medium text-muted">Relevance: </span>
                            {item.relevance}
                          </p>
                        ) : null}
                      </div>
                      {writable ? (
                        <form action={deleteContextItemAction} className="opacity-0 transition-opacity group-hover:opacity-100">
                          <input type="hidden" name="id" value={item.id} />
                          <DangerSubmit
                            variant="ghost"
                            size="icon"
                            className="size-7 text-faint hover:text-red-300"
                            message={`Remove this ${TYPE_LABEL[item.type].toLowerCase()} from the ISMS context?`}
                            aria-label="Remove context item"
                          >
                            <Trash2 className="size-3.5" />
                          </DangerSubmit>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line px-4 py-10 text-center">
                <ShieldQuestion className="size-5 text-faint" />
                <p className="text-[12px] font-medium text-ink">No context captured yet</p>
                <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
                  Clauses 4.1 and 4.2 require you to determine internal and external issues and the interested parties relevant
                  to your ISMS, and their requirements. Add the first item to start the register.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <div>
              <CardTitle>Add item</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">One issue or party per record.</p>
            </div>
            <Plus className="size-4 text-faint" />
          </CardHeader>
          <CardContent>
            <form action={createContextItemAction}>
              <Field label="Type" htmlFor="type">
                <Select id="type" name="type" defaultValue="INTERNAL" required>
                  <option value="INTERNAL">Internal issue</option>
                  <option value="EXTERNAL">External issue</option>
                  <option value="PARTY">Interested party</option>
                </Select>
              </Field>
              <Field label="Party" htmlFor="party" hint="Required for an interested party; optional for an issue.">
                <Input id="party" name="party" placeholder="e.g. Enterprise customers" />
              </Field>
              <Field label="Description" htmlFor="description">
                <Textarea id="description" name="description" rows={3} placeholder="Short description" required />
              </Field>
              <Field label="Needs & expectations (4.2)" htmlFor="needs">
                <Textarea
                  id="needs"
                  name="needs"
                  rows={2}
                  placeholder="e.g. Data protection, uptime, breach notification within 72h"
                />
              </Field>
              <Field label="Relevance to the ISMS" htmlFor="relevance" className="mb-0">
                <Textarea id="relevance" name="relevance" rows={2} placeholder="Why it matters / how it shapes scope & risk" />
              </Field>
              <div className="mt-4 flex justify-end border-t border-line-soft pt-4">
                <SubmitButton variant="primary" pendingText="Adding…" disabled={!writable}>
                  <Plus className="size-3.5" /> Add item
                </SubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
