"use client";

import { useActionState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { Plan } from "@prisma/client";
import type { WorkspaceActionState } from "@/actions/workspace";

export function PlanSelector({
  currentPlan,
  action,
  disabled,
}: {
  currentPlan: Plan;
  action: (state: WorkspaceActionState, formData: FormData) => Promise<WorkspaceActionState>;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<WorkspaceActionState, FormData>(action, null);

  return (
    <div>
      {state?.error ? (
        <div className="mb-3 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[11.5px] text-red-200">{state.error}</div>
      ) : null}
      {state?.success ? (
        <div className="mb-3 rounded-xl border border-mint/25 bg-mint/[0.06] px-3.5 py-2.5 text-[11.5px] text-emerald-200">{state.success}</div>
      ) : null}

      <form action={formAction} className="grid gap-3 lg:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const current = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-panel p-4 ring-sheen",
                current ? "border-brand/40" : plan.highlight ? "border-brand/20" : "border-line",
              )}
            >
              {plan.highlight && !current ? (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border border-brand/30 bg-[#0b1a33] px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                  <Sparkles className="size-2.5" /> Popular
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-ink">{plan.name}</p>
                {current ? <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[8.5px] text-sky-200">Current</span> : null}
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-faint">{plan.tagline}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="font-mono text-[27px] leading-none tracking-[-0.05em] text-ink">${plan.price}</span>
                <span className="pb-0.5 text-[9.5px] text-faint">/ mo</span>
              </div>
              <ul className="mt-3 flex-1 space-y-1.5 border-t border-line-soft pt-3">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-1.5 text-[10px] leading-snug text-muted">
                    <Check className="mt-0.5 size-2.5 shrink-0 text-mint" /> {feature}
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                name="plan"
                value={plan.id}
                disabled={current || pending || disabled}
                className={cn(
                  "mt-4 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border text-[11px] font-medium transition-colors",
                  current
                    ? "cursor-default border-line bg-transparent text-faint"
                    : "border-brand/30 bg-brand/10 text-sky-200 hover:border-brand/50 hover:bg-brand/15",
                  (pending || disabled) && "cursor-not-allowed opacity-50",
                )}
              >
                {pending ? <Loader2 className="size-3 animate-spin" /> : null}
                {current ? "Current plan" : pending ? "Switching…" : `Switch to ${plan.name}`}
              </button>
              <p className="mt-1.5 text-center text-[8.5px] text-faint">
                {plan.seats} seats · {plan.workspaces} workspace{plan.workspaces === 1 ? "" : "s"}
              </p>
            </div>
          );
        })}
      </form>
    </div>
  );
}
