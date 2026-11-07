import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarClock,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  Filter,
  FolderLock,
  Link2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RegisterTools } from "@/components/app/register-tools";
import { UploadEvidenceForm } from "@/components/evidence/upload-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DangerSubmit } from "@/components/ui/danger-submit";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { evidenceOptions, evidenceSummary, evidenceValidity, listEvidence } from "@/lib/services/evidence";
import { deleteEvidenceAction, uploadEvidenceAction } from "@/actions/evidence";
import { bytes, cn, formatDate, titleCase } from "@/lib/utils";
import type { EvidenceKind } from "@prisma/client";

export const metadata: Metadata = { title: "Evidence" };
export const dynamic = "force-dynamic";

const KINDS: { value: EvidenceKind | "ALL"; label: string }[] = [
  { value: "ALL", label: "All types" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "REPORT", label: "Reports" },
  { value: "SCREENSHOT", label: "Screenshots" },
  { value: "LOG", label: "Logs" },
  { value: "OTHER", label: "Other" },
];

const kindTone: Record<EvidenceKind, "brand" | "mint" | "violet" | "amber" | "neutral"> = {
  DOCUMENT: "brand",
  REPORT: "violet",
  SCREENSHOT: "mint",
  LOG: "amber",
  OTHER: "neutral",
};

const VALIDITY = [
  { value: "ALL", label: "Any validity" },
  { value: "EXPIRING", label: "Expiring in 45 days" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NONE", label: "No expiry recorded" },
] as const;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    validity?: string;
    policyId?: string;
    riskId?: string;
    controlId?: string;
    uploaded?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const kind = KINDS.some((item) => item.value === params.kind) ? (params.kind as EvidenceKind | "ALL") : "ALL";
  const validity = VALIDITY.some((item) => item.value === params.validity) ? params.validity! : "ALL";
  const writable = canWrite(context.role);

  const [evidence, summary, options] = await Promise.all([
    listEvidence(context.workspace.id, {
      q: params.q,
      kind,
      validity: validity as (typeof VALIDITY)[number]["value"],
      policyId: params.policyId,
      riskId: params.riskId,
      controlId: params.controlId,
    }),
    evidenceSummary(context.workspace.id),
    evidenceOptions(context.workspace.id),
  ]);

  const linkedFilter = params.policyId
    ? options.policies.find((policy) => policy.id === params.policyId)?.title
    : params.riskId
      ? options.risks.find((risk) => risk.id === params.riskId)?.title
      : params.controlId
        ? options.controls.find((control) => control.id === params.controlId)?.ref
        : null;
  const filtered = Boolean(params.q || (params.kind && params.kind !== "ALL") || (params.validity && params.validity !== "ALL") || linkedFilter);

  return (
    <div>
      <PageHeader
        eyebrow="Audit trail"
        title="Evidence repository"
        description="The artifacts behind every control: versioned, checksummed, linked to the policy or risk it proves, and downloadable by the auditor."
        actions={<RegisterTools register="evidence" />}
      />

      {params.uploaded ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          <FileCheck2 className="size-3.5" /> “{params.uploaded}” uploaded and checksummed.
        </div>
      ) : null}
      {params.deleted ? (
        <div className="mb-4 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">
          Evidence record deleted.
        </div>
      ) : null}
      {params.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{params.error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Artifacts", value: summary.count, icon: FolderLock, tone: "text-sky-300 border-brand/25 bg-brand/10" },
          { label: "Linked evidence", value: summary.linked, icon: Link2, tone: "text-emerald-300 border-mint/25 bg-mint/10" },
          { label: "Expiring soon", value: summary.expiring, icon: CalendarClock, tone: "text-amber-300 border-warning/25 bg-warning/10" },
          { label: "Expired", value: summary.expired, icon: ShieldAlert, tone: "text-red-300 border-danger/25 bg-danger/10" },
          { label: "Storage used", value: bytes(summary.totalBytes), icon: FileArchive, tone: "text-indigo-300 border-violet/25 bg-violet/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
              <span className={cn("grid size-6 place-items-center rounded-md border", stat.tone)}>
                <stat.icon className="size-3" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[21px] leading-none text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardContent className="p-0">
            <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Search evidence…" className="pl-8" aria-label="Search evidence" />
              </div>
              <Select name="kind" defaultValue={kind} className="w-auto min-w-[124px]" aria-label="Filter by evidence type">
                {KINDS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Select name="validity" defaultValue={validity} className="w-auto min-w-[150px]" aria-label="Filter by validity">
                {VALIDITY.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                <Filter className="size-3.5" /> Filter
              </button>
              {filtered ? (
                <Link href="/evidence" className="px-1 text-[10.5px] text-faint hover:text-ink">
                  Clear
                </Link>
              ) : null}
            </form>

            {linkedFilter ? (
              <div className="flex items-center gap-2 border-b border-line-soft bg-brand/[0.035] px-4 py-2 text-[10.5px] text-sky-200">
                <Link2 className="size-3" /> Filtered to evidence linked to <span className="font-medium">{linkedFilter}</span>
                <Link href="/evidence" className="ml-auto text-faint hover:text-ink">
                  Remove
                </Link>
              </div>
            ) : null}

            {evidence.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={FolderLock}
                  title={filtered ? "No evidence matches those filters" : "No evidence uploaded yet"}
                  description={
                    filtered
                      ? "Try another search or clear the type filter."
                      : "Upload the access review, vulnerability scan or policy sign-off your auditor will ask for."
                  }
                  action={
                    filtered ? (
                      <Link href="/evidence" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                        Clear filters
                      </Link>
                    ) : writable ? (
                      <a href="#upload" className={buttonVariants({ variant: "primary", size: "sm" })}>
                        <FolderLock className="size-3.5" /> Upload the first artifact
                      </a>
                    ) : null
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">                                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2.5 font-semibold">Artifact</th>
                      <th className="px-3 py-2.5 font-semibold">Type</th>
                      <th className="px-3 py-2.5 font-semibold">Linked to</th>
                      <th className="px-3 py-2.5 font-semibold">Validity</th>
                      <th className="px-3 py-2.5 font-semibold">Uploaded</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {evidence.map((item) => (
                      <tr key={item.id} className="group transition-colors hover:bg-white/[0.022]">
                        <td className="max-w-[280px] px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-brand">
                              <FileText className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11.5px] font-medium text-ink">{item.name}</p>
                              <p className="truncate text-[9.5px] text-faint">{item.fileName}</p>
                              <p className="mt-0.5 text-[9px] text-faint">{bytes(item.sizeBytes)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={kindTone[item.kind]}>{titleCase(item.kind)}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex max-w-[210px] flex-wrap gap-1">
                            {item.policy ? (
                              <Link
                                href={`/policies/${item.policy.id}`}
                                className="max-w-[160px] truncate rounded border border-line bg-raised px-1.5 py-0.5 text-[9px] text-muted hover:text-sky-200"
                              >
                                {item.policy.title}
                              </Link>
                            ) : null}
                            {item.risk ? (
                              <Link
                                href={`/risks/${item.risk.id}`}
                                className="max-w-[160px] truncate rounded border border-line bg-raised px-1.5 py-0.5 text-[9px] text-muted hover:text-sky-200"
                              >
                                {item.risk.title}
                              </Link>
                            ) : null}
                            {item.control ? (
                              <span className="rounded border border-brand/20 bg-brand/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-sky-200">
                                {item.control.ref}
                              </span>
                            ) : null}
                            {!item.policy && !item.risk && !item.control ? <span className="text-[9.5px] text-faint">Unlinked</span> : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {(() => {
                            const status = evidenceValidity(item.expiresAt);
                            return (
                              <>
                                <Badge
                                  tone={status.state === "EXPIRED" ? "red" : status.state === "EXPIRING" ? "amber" : status.state === "VALID" ? "mint" : "neutral"}
                                  dot
                                >
                                  {status.label}
                                </Badge>
                                <p className="mt-0.5 text-[9px] text-faint">
                                  {item.expiresAt ? `Until ${formatDate(item.expiresAt)}` : "Not recorded"}
                                </p>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-[10px] text-muted">{item.uploadedBy.name}</p>
                          <p className="mt-0.5 text-[9px] text-faint">{formatDate(item.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={`/api/evidence/${item.id}/download`}
                              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-faint hover:text-sky-200")}
                              title="Download evidence"
                              aria-label={`Download ${item.name}`}
                            >
                              <Download className="size-3.5" />
                            </a>
                            {writable ? (
                              <form action={deleteEvidenceAction}>
                                <input type="hidden" name="evidenceId" value={item.id} />
                                <DangerSubmit
                                  variant="ghost"
                                  size="icon"
                                  className="text-faint hover:text-red-300"
                                  message={`Delete "${item.name}"? The stored file will be removed.`}
                                  title="Delete evidence"
                                  aria-label={`Delete ${item.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </DangerSubmit>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div id="upload" className="scroll-mt-20">
          {writable ? (
            <UploadEvidenceForm
              action={uploadEvidenceAction}
              policies={options.policies}
              risks={options.risks}
              controls={options.controls}
              defaults={{ policyId: params.policyId, riskId: params.riskId, controlId: params.controlId }}
            />
          ) : (
            <Card>
              <CardContent className="p-5 text-center">
                <FolderLock className="mx-auto size-6 text-faint" />
                <p className="mt-3 text-[12px] font-medium text-ink">Read-only access</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-faint">
                  Your role can download evidence but not upload or delete it.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-3 rounded-xl border border-line bg-panel/50 p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
              <ShieldCheck className="size-3 text-mint" /> Integrity by default
            </p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-faint">
              <li>Each file is hashed with SHA-256 at upload.</li>
              <li>Downloads are authorised per workspace.</li>
              <li>Evidence is never served from a public URL.</li>
              <li>Deletion removes the record and stored object.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
