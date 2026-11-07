"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ControlStatus } from "@prisma/client";

export function ControlStatusSelect({
  controlId,
  status,
  disabled,
  action,
}: {
  controlId: string;
  status: ControlStatus;
  disabled?: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="relative inline-flex">
      <input type="hidden" name="controlId" value={controlId} />
      <select
        key={status}
        name="status"
        defaultValue={status}
        disabled={disabled}
        aria-label="Control status"
        onChange={() => formRef.current?.requestSubmit()}
        className={cn(
          "h-7 appearance-none rounded-md border px-2 pr-6 text-[10px] font-medium outline-none transition-colors disabled:cursor-not-allowed",
          status === "IMPLEMENTED"
            ? "border-mint/30 bg-mint/10 text-emerald-200"
            : status === "IN_PROGRESS"
              ? "border-brand/30 bg-brand/10 text-sky-200"
              : status === "NOT_APPLICABLE"
                ? "border-line bg-transparent text-faint"
                : "border-line bg-raised text-muted",
        )}
      >
        <option value="NOT_STARTED">Not started</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="IMPLEMENTED">Implemented</option>
        <option value="NOT_APPLICABLE">Not applicable</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 opacity-60" />
    </form>
  );
}
