import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicNav } from "@/components/marketing/public-nav";
import { PublicFooter } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple workspace pricing for in-house compliance teams and consultancies. Growth $199, Pro $499, Consultant $600 per month.",
};

const faqs = [
  {
    q: "Is pricing per workspace or per user?",
    a: "Each price covers one workspace with the seat allowance shown on the card. Additional client workspaces are available on Pro and Consultant plans.",
  },
  {
    q: "What happens when the audit is over?",
    a: "Keep the workspace moving. Policies, risks and evidence stay versioned so the next review starts from what you already have rather than a blank page.",
  },
  {
    q: "Can a consultant manage several clients?",
    a: "Yes. The Consultant plan is built for practices, with multiple client workspaces and a single login that can switch between them without mixing data.",
  },
  {
    q: "Does this replace my auditor?",
    a: "No. Auditix gives your team and your auditor the same source of truth: the control record, the policy versions and the evidence trail behind each one.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <PublicNav />
      <section className="hero-glow border-b border-line py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Pricing</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] tracking-[-0.045em] text-ink md:text-[52px]">
            Simple enough to explain to finance.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[13.5px] leading-relaxed text-muted">
            No implementation fee, no per-control pricing and no surprise audit-season invoice. Pick the workspace that matches the work.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Start a workspace <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Explore the demo
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-4">
        <PricingSection heading={false} />
      </div>

      <section className="border-t border-line py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Questions</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">Before you start.</h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
              Still unsure which plan fits? Create a workspace and change it later — this demo does not collect a payment method.
            </p>
          </div>
          <div className="divide-y divide-line rounded-2xl border border-line bg-panel">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 open:bg-white/[0.015]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[12.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-muted">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
