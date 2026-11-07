import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FolderLock,
  History,
  PencilLine,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Markdown } from "@/components/markdown";
import { Badge, PolicyBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { getPolicy } from "@/lib/services/policies";
import { deletePolicyAction, setPolicyStatusAction } from "@/actions/policies";
import { cn, daysUntil, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const context = await getWorkspaceContext();
  const policy = await getPolicy(context.workspace.id, id);
  return { title: policy?.title ?? "Policy" };
}

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; status?: string; generated?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const context = await getWorkspaceContext();
  const policy = await getPolicy(context.workspace.id, id);
  if (!policy) notFound();

  const writable = canWrite(context.role);
  const days = daysUntil(policy.reviewDueAt);
  const reviewOverdue = days !== null && days < 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-[10.5px] text-faint">
        <Link href="/policies" className="inline-flex items-center gap-1.5 hover:text-ink">
          <ArrowLeft className="size-3" /> Policies
        </Link>
        <span>/</span>
        <span className="truncate text-muted">{policy.title}</span>
      </div>

      {query.saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <CheckCircle2 className="size-3.5" /> New version saved. The previous revision remains in the audit history.
        </div>
      ) : null}
      {query.status === "updated" ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-[11.5px] text-sky-200">
          <CheckCircle2 className="size-3.5" /> Policy status updated.
        </div>
      ) : null}
      {query.generated ? (
        <div className="mb-4 rounded-xl border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-[11.5px] text-sky-200">
          <p className="flex items-center gap-2 font-medium">
            <Sparkles className="size-3.5" /> AI draft created — it is not authoritative yet.
          </p>
          <p className="mt-1 text-sky-200/75">
            Read it, edit anything that does not match how you actually operate, then submit it for review. Approval records your
            identity and the time as the accountable approver.
          </p>
        </div>
      ) : null}
      {policy.aiGenerated && policy.status !== "APPROVED" ? (
        <p className="mb-4 flex items-center gap-2 text-[10.5px] text-amber-200/80">
          <Sparkles className="size-3" /> Drafted with AI{policy.aiModel ? ` (${policy.aiModel})` : ""} — human review required before approval.
        </p>
      ) : null}

      <PageHeader
        eyebrow={`${policy.category} · Policy`}
        title={policy.title}
        description={policy.summary ?? "No summary has been written for this policy yet."}
        actions={
          <>
            <a
              href={`/api/v1/policies/${policy.id}/export`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              title="Download this policy as Markdown"
            >
              <Download className="size-3.5" /> Export .md
            </a>
            {writable ? (
              <>
              <Link href={`/policies/${policy.id}/edit`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <PencilLine className="size-3.5" /> Edit policy
              </Link>
              {policy.status === "DRAFT" || policy.status === "RETIRED" ? (
                <form action={setPolicyStatusAction}>
                  <input type="hidden" name="policyId" value={policy.id} />
                  <input type="hidden" name="status" value="IN_REVIEW" />
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                    <Send className="size-3.5" /> Submit for review
                  </button>
                </form>
              ) : policy.status === "IN_REVIEW" ? (
                <form action={setPolicyStatusAction}>
                  <input type="hidden" name="policyId" value={policy.id} />
                  <input type="hidden" name="status" value="APPROVED" />
                  <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                    <Check className="size-3.5" /> Approve policy
                  </button>
                </form>
              ) : null}
              </>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PolicyBadge status={policy.status} />
        <Badge tone="outline">v{policy.version}</Badge>
        <Badge tone="neutral">
          <UserRound className="size-2.5" /> {policy.owner.name}
        </Badge>
        <Badge tone={reviewOverdue ? "red" : days !== null && days <= 14 ? "amber" : "outline"}>
          <CalendarClock className="size-2.5" />
          {policy.reviewDueAt ? `Review ${formatDate(policy.reviewDueAt)}` : "No review date"}
        </Badge>
        {policy.approvedAt ? (
          <Badge tone="mint">
            <ShieldCheck className="size-2.5" /> Approved {formatDate(policy.approvedAt)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-faint">
                <FileText className="size-3.5" /> Policy document
              </div>
              <div className="flex items-center gap-2 text-[9.5px] text-faint">
                <span>Last updated {formatDateTime(policy.updatedAt)}</span>
                <span>·</span>
                <span>{Math.max(1, Math.round(policy.content.split(/\s+/).filter(Boolean).length))} words</span>
              </div>
            </div>
            <CardContent className="px-6 py-5 md:px-8">
              <Markdown content={policy.content} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Framework mapping</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Controls this policy provides evidence of coverage for.</p>
              </div>
              <Badge tone="brand">{policy.controls.length} linked</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              {policy.controls.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {policy.controls.map((row) => (
                    <Link
                      key={row.control.id}
                      href={`/controls?framework=${row.control.framework.key}&q=${row.control.ref}`}
                      className="group flex items-start gap-2.5 rounded-xl border border-line bg-canvas/40 px-3 py-2.5 transition-colors hover:border-brand/30 hover:bg-brand/[0.035]"
                    >
                      <span className="mt-0.5 rounded border border-brand/20 bg-brand/[0.07] px-1.5 py-0.5 font-mono text-[9px] text-sky-200">
                        {row.control.ref}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] leading-snug text-ink">{row.control.title}</span>
                        <span className="mt-0.5 block text-[9.5px] text-faint">{row.control.framework.name}</span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-3 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-amber-200/90">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  This policy is not mapped to any control. An auditor cannot use it as coverage until it is linked.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Linked evidence</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Artifacts that support the statements in this policy.</p>
              </div>
              <Link href={`/evidence?policyId=${policy.id}`} className="text-[10.5px] text-sky-200 hover:text-sky-100">
                Upload →
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {policy.evidence.length ? (
                <div className="space-y-1">
                  {policy.evidence.map((item) => (
                    <Link
                      key={item.id}
                      href="/evidence"
                      className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-raised text-brand">
                        <FolderLock className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink">{item.name}</span>
                        <span className="block truncate text-[9.5px] text-faint">{item.fileName}</span>
                      </span>
                      <span className="shrink-0 text-[9.5px] text-faint">{formatDate(item.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-[10.5px] text-faint">
                  No evidence is linked to this policy yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Version history</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">Immutable snapshots created each time the policy changes.</p>
              </div>
              <Badge tone="outline">
                <History className="size-2.5" /> {policy.versions.length} versions
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative space-y-0 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-line">
                {policy.versions.map((version) => (
                  <details key={version.id} className="group relative rounded-lg">
                    <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-white/[0.025] [&::-webkit-details-marker]:hidden">
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 grid size-[23px] shrink-0 place-items-center rounded-full border text-[8.5px] font-semibold",
                          version.version === policy.version
                            ? "border-brand/50 bg-[#0c2036] text-sky-200"
                            : "border-line bg-panel text-faint",
                        )}
                      >
                        v{version.version}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium text-ink">
                          {version.version === policy.version ? "Current version" : `Version ${version.version}`}
                          {version.version === policy.version ? <Badge tone="brand">current</Badge> : null}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] text-faint">
                          {formatDateTime(version.createdAt)} · {version.changedBy.name}
                          {version.note ? ` · ${version.note}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-[9px] text-faint transition-transform group-open:rotate-180">▾</span>
                    </summary>
                    <div className="ml-8 max-h-64 overflow-y-auto rounded-lg border border-line-soft bg-canvas/50 px-4 py-3">
                      <Markdown content={version.content} />
                    </div>
                  </details>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review workflow</CardTitle>
              <PolicyBadge status={policy.status} />
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              {[
                { label: "Draft", done: true, active: policy.status === "DRAFT" },
                { label: "In review", done: ["IN_REVIEW", "APPROVED"].includes(policy.status), active: policy.status === "IN_REVIEW" },
                { label: "Approved", done: policy.status === "APPROVED", active: policy.status === "APPROVED" },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded-full border text-[8px]",
                      step.done ? "border-mint/50 bg-mint/10 text-mint" : "border-line bg-canvas text-transparent",
                    )}
                  >
                    <Check className="size-2.5" />
                  </span>
                  <span className={cn("text-[11px]", step.active ? "font-medium text-ink" : "text-faint")}>{step.label}</span>
                </div>
              ))}

              {writable ? (
                <div className="mt-3 space-y-1.5 border-t border-line-soft pt-3">
                  {policy.status === "IN_REVIEW" ? (
                    <form action={setPolicyStatusAction}>
                      <input type="hidden" name="policyId" value={policy.id} />
                      <input type="hidden" name="status" value="DRAFT" />
                      <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                        <RotateCcw className="size-3" /> Return to draft
                      </button>
                    </form>
                  ) : null}
                  {policy.status === "APPROVED" ? (
                    <>
                      <form action={setPolicyStatusAction}>
                        <input type="hidden" name="policyId" value={policy.id} />
                        <input type="hidden" name="status" value="IN_REVIEW" />
                        <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                          <Send className="size-3" /> Start next review
                        </button>
                      </form>
                      <form action={setPolicyStatusAction}>
                        <input type="hidden" name="policyId" value={policy.id} />
                        <input type="hidden" name="status" value="RETIRED" />
                        <button type="submit" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full")}>
                          Retire policy
                        </button>
                      </form>
                    </>
                  ) : null}
                  {policy.status === "RETIRED" ? (
                    <form action={setPolicyStatusAction}>
                      <input type="hidden" name="policyId" value={policy.id} />
                      <input type="hidden" name="status" value="DRAFT" />
                      <button type="submit" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "w-full")}>
                        <RotateCcw className="size-3" /> Restore to draft
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 rounded-lg border border-line-soft bg-canvas/50 px-2.5 py-2 text-[10px] text-faint">
                  Your role can read this policy but not change its status.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policy record</CardTitle>
              <ClipboardList className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                ["Owner", policy.owner.name],
                ["Category", policy.category],
                ["Version", `v${policy.version}`],
                ["Created", formatDate(policy.createdAt)],
                ["Last updated", formatDate(policy.updatedAt)],
                ["Next review", policy.reviewDueAt ? formatDate(policy.reviewDueAt) : "Not scheduled"],
                ["Approved", policy.approvedAt ? formatDate(policy.approvedAt) : "Not approved"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 text-[10.5px]">
                  <span className="text-faint">{label}</span>
                  <span className="text-right text-muted">{value}</span>
                </div>
              ))}
              {reviewOverdue ? (
                <div className="flex items-start gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.06] px-2.5 py-2 text-[10px] leading-relaxed text-red-200">
                  <AlertCircle className="mt-0.5 size-3 shrink-0" /> Review is {Math.abs(days ?? 0)} days overdue.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance note</CardTitle>
              <ShieldCheck className="size-4 text-mint" />
            </CardHeader>
            <CardContent className="pt-0 text-[10.5px] leading-relaxed text-faint">
              An approved policy with at least one mapped control and current review date is considered audit-ready. Retired
              policies remain in the history but no longer provide coverage.
            </CardContent>
          </Card>

          {writable ? (
            <details className="group rounded-2xl border border-line bg-panel p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint hover:text-red-300 [&::-webkit-details-marker]:hidden">
                Danger zone <Trash2 className="size-3.5" />
              </summary>
              <p className="mt-3 text-[10.5px] leading-relaxed text-faint">
                Deleting removes the policy, every version and all framework mappings. The linked evidence files stay in the
                repository but lose this link.
              </p>
              <form action={deletePolicyAction} className="mt-3">
                <input type="hidden" name="policyId" value={policy.id} />
                <DangerSubmit
                  variant="danger"
                  size="sm"
                  className="w-full"
                  message={`Delete "${policy.title}" and its ${policy.versions.length} versions? This cannot be undone.`}
                >
                  <Trash2 className="size-3.5" /> Delete this policy
                </DangerSubmit>
              </form>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
