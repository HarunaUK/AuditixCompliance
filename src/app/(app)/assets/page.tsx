import type { Metadata } from "next";
import { Boxes, Globe2, Plus, ShieldAlert, UserRound } from "lucide-react";
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
import { cn, formatDate } from "@/lib/utils";
import { createAssetAction, deleteAssetAction } from "@/actions/registers";

export const metadata: Metadata = { title: "Asset inventory" };
export const dynamic = "force-dynamic";

const TYPES = ["Application", "Server", "Database", "Cloud service", "Endpoint", "Network", "People", "Facility"];
const CLASSIFICATIONS = ["Public", "Internal", "Confidential", "Restricted"];

const CLASS_TONE = {
  Public: "neutral",
  Internal: "brand",
  Confidential: "violet",
  Restricted: "red",
} as const;

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, context] = await Promise.all([searchParams, getWorkspaceContext()]);
  const [assets, members] = await Promise.all([
    db.asset.findMany({
      where: { workspaceId: context.workspace.id },
      include: { owner: { select: { name: true } } },
      orderBy: [{ inScope: "desc" }, { name: "asc" }],
    }),
    db.workspaceMember.findMany({
      where: { workspaceId: context.workspace.id },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const writable = canWrite(context.role);
  const inScope = assets.filter((asset) => asset.inScope).length;
  const sensitive = assets.filter((asset) => asset.classification === "Confidential" || asset.classification === "Restricted").length;
  const unowned = assets.filter((asset) => !asset.ownerId).length;

  return (
    <div>
      <PageHeader
        eyebrow="Clause 8.1 · asset inventory"
        title="Assets"
        description="The systems, services and information your ISMS depends on. Assets in scope drive risk, evidence and Cyber Essentials coverage."
        actions={
          <a href="#add" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/40 bg-brand-strong px-3 text-[12px] font-medium text-white">
            <Plus className="size-3.5" /> Add asset
          </a>
        }
      />

      {error ? <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assets", value: assets.length, hint: "across the inventory", icon: Boxes, tone: "text-ink" },
          { label: "In scope", value: inScope, hint: "included in the ISMS", icon: Globe2, tone: "text-sky-300" },
          { label: "Sensitive", value: sensitive, hint: "confidential or restricted", icon: ShieldAlert, tone: "text-amber-300" },
          { label: "Unowned", value: unowned, hint: "need an accountable owner", icon: UserRound, tone: unowned > 0 ? "text-red-300" : "text-emerald-300" },
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

      <Card className="mt-4" id="add">
        <details open={assets.length === 0}>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-[12px] font-medium text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Plus className="size-3.5 text-brand" /> Add an asset
            </span>
            <span className="text-[10px] text-faint">Name, type, owner and classification</span>
          </summary>
          <CardContent className="border-t border-line-soft pt-4">
            {writable ? (
              <form action={createAssetAction} className="grid gap-x-4 md:grid-cols-3">
                <Field label="Asset name" htmlFor="name">
                  <Input id="name" name="name" required placeholder="Production AWS account" maxLength={120} />
                </Field>
                <Field label="Type">
                  <Select name="type" defaultValue="Application">
                    {TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Classification">
                  <Select name="classification" defaultValue="Internal">
                    {CLASSIFICATIONS.map((classification) => (
                      <option key={classification} value={classification}>{classification}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Location or identifier" hint="IP, URL, account ID or site">
                  <Input name="location" placeholder="eu-west-1 / 203.0.113.10" maxLength={160} />
                </Field>
                <Field label="Owner">
                  <Select name="ownerId" defaultValue="">
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.user.name}</option>
                    ))}
                  </Select>
                </Field>
                <div className="mb-4 flex items-end pb-2">
                  <label className="flex items-center gap-2 text-[11px] text-muted">
                    <input type="checkbox" name="inScope" defaultChecked className="size-3.5 rounded border-line bg-canvas accent-sky-400" />
                    In ISMS scope
                  </label>
                </div>
                <Field label="Notes" className="md:col-span-3">
                  <Textarea name="notes" rows={2} placeholder="Purpose, data held, dependencies or review notes" maxLength={1000} />
                </Field>
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
          {assets.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Boxes} title="No assets yet" description="Start with the systems that hold customer data or run production services." />
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_110px_130px_70px] gap-3 border-b border-line px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint md:grid">
                <span>Asset</span><span>Type</span><span>Class</span><span>Owner</span><span>Scope</span>
              </div>
              {assets.map((asset) => (
                <div key={asset.id} className="grid gap-2 border-b border-line-soft px-4 py-3 last:border-b-0 hover:bg-white/[0.015] md:grid-cols-[minmax(0,1.5fr)_110px_110px_130px_70px] md:items-center">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-ink">{asset.name}</p>
                    <p className="mt-0.5 truncate text-[9.5px] text-faint">
                      {asset.location ?? "No location recorded"} · added {formatDate(asset.createdAt)}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted">{asset.type}</p>
                  <Badge tone={CLASS_TONE[asset.classification as keyof typeof CLASS_TONE] ?? "neutral"}>{asset.classification}</Badge>
                  <p className="truncate text-[10px] text-muted">{asset.owner?.name ?? <span className="text-red-300/80">Unassigned</span>}</p>
                  <div className="flex items-center justify-between gap-2 md:justify-start">
                    <span className={cn("text-[9.5px]", asset.inScope ? "text-emerald-300" : "text-faint")}>{asset.inScope ? "In scope" : "Out"}</span>
                    {writable ? <DeleteButton action={deleteAssetAction} id={asset.id} label={`Delete ${asset.name}`} /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
