"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, Upload, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImportKind = "policies" | "risks";

type ImportResult = { error?: string; imported?: number; issues?: string[] };

const IMPORT_COPY: Record<
  ImportKind,
  { label: string; hint: string; columns: string; noun: [string, string] }
> = {
  policies: {
    label: "Import policies",
    hint: "Every imported policy is saved as a DRAFT. Approval stays a human decision and is recorded in the audit trail.",
    columns: "Title, Category, Content, Summary, Review due — headings are matched loosely, extra columns are ignored.",
    noun: ["policy", "policies"],
  },
  risks: {
    label: "Import risks",
    hint: "Scores are calculated from likelihood × impact. Rows that fail validation are reported and skipped, never silently dropped.",
    columns:
      "Title, Description, Category, Likelihood (1–5), Impact (1–5), Treatment, Status, Owner email, Due — headings are matched loosely.",
    noun: ["risk", "risks"],
  },
};

/**
 * Export/import controls for a register. Export downloads from the register API
 * so the CSV is always workspace-scoped and permission-checked; import posts to
 * the same API and reports per-row outcomes back to the user.
 */
export function RegisterTools({ register, importKind }: { register: string; importKind?: ImportKind }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        href={`/api/v1/export/${register}`}
        className={buttonVariants({ variant: "secondary", size: "sm" })}
        title={`Download the ${register} register as CSV`}
      >
        <Download className="size-3.5" /> Export CSV
      </a>

      {importKind ? (
        <button type="button" onClick={() => setOpen(true)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <FileUp className="size-3.5" /> Import CSV
        </button>
      ) : null}

      {open && importKind ? <ImportDialog kind={importKind} register={register} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ImportDialog({ kind, register, onClose }: { kind: ImportKind; register: string; onClose: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const copy = IMPORT_COPY[kind];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;

    const data = new FormData(formRef.current);
    const file = data.get("file");
    let csv = String(data.get("csv") ?? "");
    if (file instanceof File && file.size > 0) csv = await file.text();

    if (!csv.trim()) {
      setResult({ error: "Choose a CSV file or paste its contents." });
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(`/api/v1/import/${register}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const payload = (await response.json()) as ImportResult;
      if (!response.ok) {
        setResult({ error: payload.error ?? "The import failed.", issues: payload.issues });
      } else {
        setResult({ imported: payload.imported, issues: payload.issues });
        formRef.current.reset();
        router.refresh();
      }
    } catch {
      setResult({ error: "Could not reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.label}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm" />
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl border border-line bg-[#0a1324] shadow-[0_40px_90px_-30px_rgba(2,8,23,0.95)]">
        <header className="flex items-start gap-2.5 border-b border-line px-5 py-4">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-sky-300/25 bg-brand/10">
            <Upload className="size-4 text-sky-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-medium text-ink">{copy.label}</h2>
            <p className="mt-0.5 text-[10.5px] text-faint">CSV · up to 300 rows per file</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-faint transition hover:bg-white/5 hover:text-ink" aria-label="Close">
            <X className="size-3.5" />
          </button>
        </header>

        <form ref={formRef} onSubmit={submit} className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-line bg-panel px-3 py-2.5 text-[11px] leading-relaxed text-muted">{copy.hint}</div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">CSV file</span>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv,text/plain"
              className="block w-full cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-[11.5px] text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-[11px] file:text-ink"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">Or paste CSV</span>
            <textarea
              name="csv"
              rows={4}
              placeholder={copy.columns}
              className="w-full resize-y rounded-lg border border-line bg-panel px-3 py-2 font-mono text-[11px] text-ink placeholder:text-faint/70 focus:border-brand/60 focus:outline-none"
            />
          </label>

          <p className="text-[10.5px] leading-relaxed text-faint">{copy.columns}</p>

          {result?.error ? (
            <p className="flex items-start gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.07] px-2.5 py-2 text-[11px] text-red-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {result.error}
            </p>
          ) : null}
          {result?.imported ? (
            <p className="flex items-start gap-1.5 rounded-lg border border-mint/25 bg-mint/[0.07] px-2.5 py-2 text-[11px] text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> Imported {result.imported}{" "}
              {result.imported === 1 ? copy.noun[0] : copy.noun[1]}
              {kind === "policies" ? " as drafts. Approve them once you have reviewed the text." : "."}
            </p>
          ) : null}
          {result?.issues?.length ? (
            <ul className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-warning/20 bg-warning/[0.05] px-3 py-2 text-[10.5px] text-amber-200">
              {result.issues.map((issue) => (
                <li key={issue}>· {issue}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <a
              href={`/api/v1/export/${register}?template=1`}
              className="inline-flex items-center gap-1 text-[11px] text-sky-300 underline-offset-2 hover:underline"
            >
              <Download className="size-3" /> Download template
            </a>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                {result?.imported ? "Done" : "Cancel"}
              </button>
              <button type="submit" disabled={busy} className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
                {busy ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Importing…
                  </>
                ) : (
                  "Import"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
