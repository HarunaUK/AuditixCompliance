"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileCheck2, Link2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateFrameworkControlAction } from "@/actions/frameworks";

type ControlStatus = "NOT_STARTED" | "IN_PROGRESS" | "IMPLEMENTED" | "NOT_APPLICABLE";

const STATUS_OPTIONS: { value: ControlStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "NOT_APPLICABLE", label: "N/A" },
];

export function FrameworkControlRow({
  frameworkKey,
  control,
  members,
  disabled,
}: {
  frameworkKey: string;
  control: {
    id: string;
    ref: string;
    title: string;
    description: string;
    iso: string[];
    status: ControlStatus;
    ownerId: string | null;
    dueDate: Date | null;
    reviewFrequency: string | null;
    evidence: { id: string; name: string }[];
    reused: string[];
  };
  members: { id: string; name: string }[];
  disabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await updateFrameworkControlAction(formData);
        router.refresh();
      }}
      className="group border-b border-line-soft px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.015]"
    >
      <input type="hidden" name="frameworkKey" value={frameworkKey} />
      <input type="hidden" name="controlId" value={control.id} />

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[9.5px] text-muted">{control.ref}</span>
            <p className="text-[12.5px] font-medium leading-snug text-ink">{control.title}</p>
          </div>
          <p className="mt-1.5 max-w-3xl text-[10.5px] leading-relaxed text-faint">{control.description}</p>
          {control.iso.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Link2 className="size-2.5 text-faint" />
              {control.iso.map((ref) => (
                <span key={ref} className="rounded border border-line-soft bg-canvas/60 px-1.5 py-0.5 font-mono text-[9px] text-faint">
                  ISO {ref}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-1">
          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint/80">Evidence</p>
            {control.evidence.length > 0 ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-sky-200">
                <Paperclip className="size-2.5" /> {control.evidence.length} attached
              </p>
            ) : control.reused.length > 0 ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-200">
                <FileCheck2 className="size-2.5" /> {control.reused.length} from ISO 27001
              </p>
            ) : (
              <p className="mt-0.5 text-[10px] text-faint/70">none attached</p>
            )}
          </div>

          <div>
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint/80">Owner</p>
            <span className="relative mt-0.5 block">
              <select
                name="ownerId"
                defaultValue={control.ownerId ?? ""}
                disabled={disabled}
                aria-label={`Owner for ${control.ref}`}
                onChange={() => formRef.current?.requestSubmit()}
                className="w-full appearance-none rounded border border-transparent bg-transparent py-0.5 pr-4 text-[10.5px] text-muted outline-none hover:border-line focus:border-brand/50 disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-2.5 -translate-y-1/2 text-faint" />
            </span>
          </div>

          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint/80">Due</p>
              <input
                type="date"
                name="dueDate"
                defaultValue={control.dueDate ? control.dueDate.toISOString().slice(0, 10) : ""}
                disabled={disabled}
                aria-label={`Due date for ${control.ref}`}
                onChange={() => formRef.current?.requestSubmit()}
                className="w-full rounded border border-transparent bg-transparent py-0.5 text-[10px] text-muted outline-none hover:border-line focus:border-brand/50 disabled:opacity-60 [color-scheme:dark]"
              />
            </div>
            <div className="w-[104px]">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-faint/80">Review</p>
              <span className="relative block">
                <select
                  name="reviewFrequency"
                  defaultValue={control.reviewFrequency ?? ""}
                  disabled={disabled}
                  aria-label={`Review frequency for ${control.ref}`}
                  onChange={() => formRef.current?.requestSubmit()}
                  className="w-full appearance-none rounded border border-transparent bg-transparent py-0.5 pr-3 text-[10px] text-muted outline-none hover:border-line focus:border-brand/50 disabled:opacity-60"
                >
                  <option value="">—</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-0 top-1/2 size-2.5 -translate-y-1/2 text-faint" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="submit"
              name="status"
              value={option.value}
              disabled={disabled}
              className={cn(
                "h-6 rounded-md border px-2 text-[9.5px] font-medium transition-colors disabled:cursor-not-allowed",
                control.status === option.value
                  ? option.value === "IMPLEMENTED"
                    ? "border-mint/40 bg-mint/15 text-emerald-100"
                    : option.value === "IN_PROGRESS"
                      ? "border-brand/40 bg-brand/15 text-sky-100"
                      : option.value === "NOT_APPLICABLE"
                        ? "border-line bg-raised text-muted"
                        : "border-warning/35 bg-warning/10 text-amber-100"
                  : "border-transparent text-faint hover:border-line hover:text-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-faint/70">Changes save automatically</p>
      </div>
    </form>
  );
}
