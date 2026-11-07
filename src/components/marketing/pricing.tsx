import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PricingSection({ heading = true }: { heading?: boolean }) {
  return (
    <section id="pricing" className="border-t border-line py-20">
      <div className="mx-auto max-w-6xl px-5">
        {heading ? (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Pricing</p>
            <h2 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink md:text-[42px]">
              Priced for the audit you actually have.
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
              One workspace, every framework. Start with the controls you need today and add client workspaces when the practice grows.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-panel p-6 ring-sheen",
                  plan.highlight
                    ? "border-brand/35 shadow-[0_30px_80px_-50px_rgba(56,189,248,0.55)]"
                    : "border-line",
                )}
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full border border-brand/40 bg-[#0b1a33] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-sky-200">
                    <Sparkles className="size-2.5" /> Most popular
                  </span>
                ) : null}
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">{plan.name}</h3>
                  <span className="text-[10px] text-faint">{plan.seats} seats</span>
                </div>
                <p className="mt-1 min-h-[36px] text-[12px] leading-relaxed text-faint">{plan.tagline}</p>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.05em] text-ink">${plan.price}</span>
                  <span className="pb-1 text-[11px] text-faint">/ month</span>
                </div>
                <div className="mt-1 text-[10.5px] text-faint">USD · billed monthly · cancel anytime</div>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: plan.highlight ? "primary" : "secondary", size: "md" }),
                    "mt-6 w-full",
                  )}
                >
                  {key === "CONSULTANT" ? "Start a practice workspace" : "Start with " + plan.name}
                </Link>
                <div className="my-6 h-px bg-line/80" />
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-[12px] leading-snug text-muted">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-mint" strokeWidth={2.2} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6 text-[10.5px] text-faint">
                  {plan.workspaces === 1 ? "1 workspace included" : `${plan.workspaces} workspaces included`}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[10.5px] text-faint">
          This demo runs billing in test mode — plans can be changed from Billing without a payment method.
        </p>
      </div>
    </section>
  );
}
