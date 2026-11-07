import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Bot, CircleAlert, Scale, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "EU AI Act overview" };
export const dynamic = "force-dynamic";

const TIERS = [
  {
    tier: "Prohibited",
    tone: "border-danger/30 bg-danger/[0.06]",
    applies: "From 2 February 2025",
    detail: "Social scoring, manipulative techniques, untargeted facial scraping, emotion recognition at work or school, and most real-time biometric identification in public.",
    action: "Remove or redesign before use. Record the screening decision.",
  },
  {
    tier: "High risk",
    tone: "border-warning/30 bg-warning/[0.05]",
    applies: "From 2 August 2026",
    detail: "Safety components, critical infrastructure, education, employment, essential services, law enforcement, migration and justice. Annex III lists the categories.",
    action: "Risk management, data governance, technical documentation, logging, human oversight, accuracy and conformity assessment.",
  },
  {
    tier: "Limited risk",
    tone: "border-brand/30 bg-brand/[0.05]",
    applies: "From 2 August 2026",
    detail: "Chatbots, emotion recognition and synthetic audio, image, video or text that people interact with or may be deceived by.",
    action: "Tell people they are interacting with AI and label synthetic content.",
  },
  {
    tier: "Minimal risk",
    tone: "border-line bg-raised/60",
    applies: "No specific duties",
    detail: "Spam filters, recommendation systems and other low-impact uses. The Act encourages voluntary codes of conduct.",
    action: "Keep an inventory entry and review if the use changes.",
  },
];

export default function EuAiActPage() {
  return (
    <div>
      <PageHeader
        eyebrow="EU compliance · AI"
        title="EU AI Act"
        description="Classify AI systems by risk, then build the governance evidence the Act expects before each obligation date."
        actions={
          <Link href="/frameworks/iso_42001" className={buttonVariants({ variant: "primary", size: "sm" })}>
            ISO 42001 controls <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">
              <Scale className="size-3" /> Risk tiers
            </p>
            <div className="mt-3 space-y-2">
              {TIERS.map((row) => (
                <div key={row.tier} className={`rounded-xl border p-3.5 ${row.tone}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-ink">{row.tier}</p>
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-faint">{row.applies}</span>
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{row.detail}</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-faint">
                    <span className="font-medium text-muted">What to do:</span> {row.action}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                <Bot className="size-3 text-brand" /> General-purpose AI
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Providers of general-purpose models need technical documentation, a training-data summary and a copyright policy. Systemic-risk
                models add evaluation, adversarial testing, incident reporting and cybersecurity duties.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-faint">
                If you only deploy a third-party model, keep the provider&apos;s documentation and your intended-use decision on file.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-faint">
                <ShieldCheck className="size-3 text-mint" /> Evidence to hold
              </p>
              <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-muted">
                <li>AI system inventory with role, purpose and tier.</li>
                <li>Intended-use statement and prohibited-use review.</li>
                <li>Impact assessment covering rights and fairness.</li>
                <li>Human-oversight design and logging configuration.</li>
                <li>Supplier terms, model documentation and change notices.</li>
                <li>Incident response and serious-incident reporting runbook.</li>
              </ul>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/[0.05] p-2.5">
                <CircleAlert className="mt-0.5 size-3 shrink-0 text-warning" />
                <p className="text-[9.5px] leading-relaxed text-amber-100/80">
                  Dates are phased and some provisions depend on implementing guidance. Confirm current applicability with counsel before relying on
                  this summary.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
