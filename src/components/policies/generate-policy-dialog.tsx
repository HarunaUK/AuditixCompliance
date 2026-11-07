"use client";

import { useActionState, useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { generatePolicyAction, type PolicyActionState } from "@/actions/policies";
import { buttonVariants } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/form";
import { POLICY_TYPES } from "@/lib/policy-types";
import { cn } from "@/lib/utils";

/**
 * "Generate Policy" — the AI writes a first draft from the workspace brief and
 * the result lands as a DRAFT that a human still has to approve.
 */
export function GeneratePolicyDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<PolicyActionState, FormData>(generatePolicyAction, null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (!open) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!enabled}
        title={enabled ? "Draft a policy with AI" : "Add AI_API_KEY to the environment to enable generation"}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "disabled:opacity-60")}
      >
        <Sparkles className="size-3.5" /> Generate policy
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Generate policy">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-line bg-[#0a1324] shadow-[0_40px_90px_-30px_rgba(2,8,23,0.95)]">
            <header className="flex items-start gap-2.5 border-b border-line px-5 py-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-sky-300/25 bg-brand/10">
                <Sparkles className="size-4 text-sky-300" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] font-medium text-ink">Generate policy</h2>
                <p className="mt-0.5 text-[10.5px] text-faint">AI-drafted from your workspace context · requires human approval</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-white/5 hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </header>

            <form action={action} className="space-y-3.5 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Policy type</span>
                <Select name="policyType" defaultValue="" required aria-label="Policy type">
                  <option value="" disabled>
                    Select a policy type…
                  </option>
                  {POLICY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>

              <p className="rounded-lg border border-line bg-panel/60 px-3 py-2 text-[10.5px] leading-relaxed text-muted">
                The draft is written against your live registers (scope, controls, risks and existing policies). It is saved as a
                DRAFT and stays non-authoritative until you review and approve it — approval records your identity and the time.
              </p>

              {state?.error ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-red-200">{state.error}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Cancel
                </button>
                <SubmitButton variant="primary" size="sm" pendingText="Drafting policy…">
                  <Sparkles className="size-3.5" /> Generate policy
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
