"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, FileUp, FolderLock, Link2, UploadCloud, X } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn, bytes } from "@/lib/utils";
import type { EvidenceActionState } from "@/actions/evidence";

type Option = { id: string; title: string };
type ControlOption = { id: string; ref: string; title: string };

export function UploadEvidenceForm({
  action,
  policies,
  risks,
  controls,
  defaults,
}: {
  action: (state: EvidenceActionState, formData: FormData) => Promise<EvidenceActionState>;
  policies: Option[];
  risks: Option[];
  controls: ControlOption[];
  defaults?: { policyId?: string; riskId?: string; controlId?: string };
}) {
  const [state, formAction] = useActionState<EvidenceActionState, FormData>(action, null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accepted = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.md,.json,.zip,.docx,.xlsx";

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <UploadCloud className="size-3.5 text-brand" /> Upload evidence
          </p>
          <p className="mt-0.5 text-[10px] text-faint">Max 10 MB · stored with a SHA-256 checksum</p>
        </div>
        <FolderLock className="size-4 text-faint" />
      </div>

      {state?.error ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-[10.5px] leading-relaxed text-red-200">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept={accepted}
        required
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-brand/25 bg-brand/[0.05] px-3 py-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-brand/25 bg-brand/10 text-brand">
            <FileUp className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-ink">{file.name}</p>
            <p className="text-[9.5px] text-faint">{bytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="grid size-6 place-items-center rounded text-faint hover:bg-white/5 hover:text-ink"
            aria-label="Remove selected file"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) {
              setFile(dropped);
              if (inputRef.current) {
                const transfer = new DataTransfer();
                transfer.items.add(dropped);
                inputRef.current.files = transfer.files;
              }
            }
          }}
          className={cn(
            "mb-3 flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-brand/60 bg-brand/[0.07]" : "border-line bg-canvas/40 hover:border-brand/30 hover:bg-brand/[0.025]",
          )}
        >
          <UploadCloud className="mb-2 size-5 text-faint" />
          <span className="text-[11px] font-medium text-muted">Drop a file, or click to browse</span>
          <span className="mt-1 text-[9px] text-faint">PDF, PNG, JPG, CSV, TXT, DOCX, XLSX or ZIP</span>
        </button>
      )}

      <Field label="Evidence name" htmlFor="evidence-name">
        <Input id="evidence-name" name="name" placeholder="e.g. Q4 access review export" required />
      </Field>
      <Field label="Description" htmlFor="evidence-description">
        <Textarea id="evidence-description" name="description" rows={2} placeholder="What this artifact proves, and for which period." />
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Type" htmlFor="evidence-kind">
          <Select id="evidence-kind" name="kind" defaultValue="DOCUMENT">
            <option value="DOCUMENT">Document</option>
            <option value="REPORT">Report</option>
            <option value="SCREENSHOT">Screenshot</option>
            <option value="LOG">Log export</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Valid until" htmlFor="evidence-expires" hint="Optional">
          <Input id="evidence-expires" name="expiresAt" type="date" />
        </Field>
      </div>

      <div className="my-3 h-px bg-line-soft" />
      <p className="mb-2 flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">
        <Link2 className="size-3" /> Link to
      </p>
      <Field label="Policy" htmlFor="evidence-policy">
        <Select id="evidence-policy" name="policyId" defaultValue={defaults?.policyId ?? ""}>
          <option value="">No policy link</option>
          {policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Risk" htmlFor="evidence-risk">
        <Select id="evidence-risk" name="riskId" defaultValue={defaults?.riskId ?? ""}>
          <option value="">No risk link</option>
          {risks.map((risk) => (
            <option key={risk.id} value={risk.id}>
              {risk.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Control" htmlFor="evidence-control" hint="Mapping evidence to a control strengthens the SoA.">
        <Select id="evidence-control" name="controlId" defaultValue={defaults?.controlId ?? ""}>
          <option value="">No control link</option>
          {controls.map((control) => (
            <option key={control.id} value={control.id}>
              {control.ref} — {control.title}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton variant="primary" className="w-full" pendingText="Uploading…">
        <UploadCloud className="size-3.5" /> Store evidence
      </SubmitButton>
      <p className="mt-2 text-center text-[9px] leading-relaxed text-faint">Files are scoped to this workspace and never publicly accessible.</p>
    </form>
  );
}
