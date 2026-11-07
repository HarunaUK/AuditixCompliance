import Link from "next/link";
import {
  ArrowRight,
  BookLock,
  Check,
  ClipboardCheck,
  FileCheck2,
  FolderLock,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/public-nav";
import { PublicFooter } from "@/components/marketing/footer";
import { PricingSection } from "@/components/marketing/pricing";
import { buttonVariants } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { RiskMatrix } from "@/components/app/risk-matrix";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BookLock,
    title: "Policies that stay current",
    copy: "Draft in Markdown, version every change, set a review cycle and map each policy to the controls it satisfies.",
    points: ["Version history", "Review dates", "Control mapping"],
  },
  {
    icon: ShieldCheck,
    title: "A risk register people use",
    copy: "Score likelihood and impact, choose a treatment, assign an owner and track actions to a deadline.",
    points: ["5×5 scoring", "Treatment plans", "Owner & due date"],
  },
  {
    icon: FolderLock,
    title: "Evidence, not a shared drive",
    copy: "Upload the artifact once, hash it for integrity and link it to the policy, risk or control it proves.",
    points: ["SHA-256 checksums", "Control links", "Secure downloads"],
  },
  {
    icon: ClipboardCheck,
    title: "Controls and SoA in one view",
    copy: "See what is implemented, in progress or not applicable across ISO 27001 and Cyber Essentials.",
    points: ["Live coverage", "Framework filters", "Audit-ready record"],
  },
];

const frameworks = ["ISO/IEC 27001:2022", "Cyber Essentials", "Security questionnaires", "Customer assurance", "Internal audit"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <PublicNav />

      <section className="hero-glow relative overflow-hidden border-b border-line">
        <div className="brand-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 md:pb-24 md:pt-24 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.07] px-3 py-1 text-[10.5px] font-medium text-sky-200">
              <Sparkles className="size-3" />
              ISO 27001:2022 · Cyber Essentials
            </div>
            <h1 className="mt-6 max-w-xl text-[42px] font-semibold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[56px] md:text-[64px]">
              Compliance,
              <br />
              without the <span className="text-gradient">busywork.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[14px] leading-relaxed text-muted md:text-[15px]">
              One workspace for policies, risk, evidence and audit readiness. Map the work once, keep it current, and walk into the audit with everything an assessor asks for.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "group")}>
                Open your workspace
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/pricing" className={buttonVariants({ variant: "outline", size: "lg" })}>
                See pricing
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-faint">
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-mint" /> No card required to explore</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-mint" /> Import-ready control sets</span>
              <span className="flex items-center gap-1.5"><Check className="size-3.5 text-mint" /> Tenant-isolated by design</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-[40px] bg-brand/[0.07] blur-3xl" />
            <div className="relative overflow-hidden rounded-[22px] border border-[#2a3d60] bg-[#0a1428] p-2.5 shadow-[0_50px_120px_-50px_rgba(2,6,23,0.95)]">
              <div className="flex items-center gap-2 border-b border-line/70 px-2 pb-2.5 pt-1">
                <span className="size-2 rounded-full bg-red-400/60" />
                <span className="size-2 rounded-full bg-amber-300/60" />
                <span className="size-2 rounded-full bg-emerald-300/60" />
                <span className="ml-2 flex h-5 flex-1 items-center rounded-md border border-line/60 bg-canvas/60 px-2 font-mono text-[8px] text-faint">
                  app.auditix.app / dashboard
                </span>
              </div>

              <div className="grid grid-cols-[46px_1fr] pt-2.5">
                <div className="flex flex-col items-center gap-3 border-r border-line/60 py-2">
                  <img src="/brand/auditix-mark.png" alt="" className="size-6 rounded-md" />
                  <span className="mt-2 h-5 w-6 rounded bg-brand/15" />
                  <span className="h-5 w-6 rounded bg-white/[0.04]" />
                  <span className="h-5 w-6 rounded bg-white/[0.04]" />
                  <span className="h-5 w-6 rounded bg-white/[0.04]" />
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.13em] text-faint">Northwind Cloud</p>
                      <p className="mt-1 text-[12px] font-medium text-ink">Good morning, Alex.</p>
                    </div>
                    <span className="rounded-full border border-mint/30 bg-mint/10 px-2 py-0.5 text-[8px] font-medium text-emerald-200">
                      Audit ready · 82%
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ["Policies", "8", "6 approved"],
                      ["Risks", "6", "2 critical"],
                      ["Evidence", "24", "18 linked"],
                    ].map(([label, value, hint]) => (
                      <div key={label} className="rounded-lg border border-line/70 bg-raised/60 p-2">
                        <p className="text-[8px] uppercase tracking-[0.1em] text-faint">{label}</p>
                        <p className="mt-1 font-mono text-[14px] text-ink">{value}</p>
                        <p className="text-[7.5px] text-faint">{hint}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 grid grid-cols-[1.15fr_0.85fr] gap-2">
                    <div className="rounded-lg border border-line/70 bg-raised/40 p-2.5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[8.5px] font-medium text-slate-200">Control coverage</p>
                        <span className="font-mono text-[8px] text-brand">68%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressRing value={68} size={74} stroke={6} caption="implemented" />
                        <div className="space-y-1.5">
                          {[
                            ["Implemented", "31", "bg-mint"],
                            ["In progress", "9", "bg-brand"],
                            ["Not started", "6", "bg-slate-600"],
                          ].map(([label, value, dot]) => (
                            <div key={label} className="flex items-center gap-1.5 text-[7.5px] text-faint">
                              <span className={cn("size-1.5 rounded-full", dot)} />
                              <span className="min-w-12">{label}</span>
                              <span className="font-mono text-slate-300">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-line/70 bg-raised/40 p-2.5">
                      <p className="mb-2 text-[8.5px] font-medium text-slate-200">Risk matrix</p>
                      <RiskMatrix
                        compact
                        data={[
                          { likelihood: 4, impact: 5, count: 1, score: 20 },
                          { likelihood: 4, impact: 4, count: 1, score: 16 },
                          { likelihood: 3, impact: 5, count: 2, score: 15 },
                          { likelihood: 3, impact: 4, count: 1, score: 12 },
                          { likelihood: 2, impact: 3, count: 1, score: 6 },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 divide-y divide-line/60 rounded-lg border border-line/70 bg-raised/30">
                    {[
                      ["Access Control Policy", "Review due in 25 days", "Approved"],
                      ["Supplier Security Policy", "Review overdue", "Approved"],
                    ].map(([title, hint, status]) => (
                      <div key={title} className="flex items-center gap-2 px-2.5 py-1.5">
                        <BookLock className="size-3 text-faint" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[8px] text-slate-200">{title}</p>
                          <p className="text-[7px] text-faint">{hint}</p>
                        </div>
                        <span className="rounded-full bg-mint/10 px-1.5 py-0.5 text-[6.5px] text-emerald-200">{status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-mint/25 bg-[#0a1a23]/95 px-3 py-2 shadow-xl backdrop-blur md:block">
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-200">
                <FileCheck2 className="size-3.5" /> Auditor package ready
              </p>
              <p className="mt-0.5 text-[8.5px] text-faint">Policies · evidence · control record</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Built for the questions you actually get</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {frameworks.map((framework) => (
              <span key={framework} className="text-[11.5px] text-muted/80">{framework}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="platform" className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-12 max-w-2xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">The workspace</p>
            <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink md:text-[40px]">
              The four things every audit asks for.
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
              Most teams run compliance across four tools and a spreadsheet. Auditix keeps the evidence, the decision and the owner in the same place — so the next review starts from what you already have.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-2xl border border-line bg-panel p-6 ring-sheen transition-colors hover:border-[#2d4369]">
                  <div className="flex items-start justify-between">
                    <span className="grid size-9 place-items-center rounded-xl border border-brand/20 bg-brand/[0.08] text-brand">
                      <Icon className="size-[17px]" strokeWidth={1.7} />
                    </span>
                    <span className="font-mono text-[10px] text-faint">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold tracking-[-0.015em] text-ink">{feature.title}</h3>
                  <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">{feature.copy}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {feature.points.map((point) => (
                      <span key={point} className="rounded-md border border-line bg-raised/60 px-2 py-1 text-[9.5px] text-faint">{point}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="frameworks" className="border-y border-line bg-[#070d1d] py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">One source of truth</p>
            <h2 className="max-w-lg text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink md:text-[38px]">
              Answer the same question once.
            </h2>
            <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-muted">
              Start with ISO 27001 or Cyber Essentials, then use the same control record to answer a customer questionnaire or prepare for an internal audit. Evidence stays linked to the control, not buried in an email thread.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["ISO/IEC 27001:2022", "Annex A controls, SoA and ISMS records"],
                ["Cyber Essentials", "The five technical control themes"],
                ["Customer assurance", "Evidence-backed questionnaire answers"],
                ["Audit preparation", "Status, owner and proof in one view"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border border-line bg-panel/70 p-4">
                  <p className="text-[12px] font-medium text-ink">{title}</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-faint">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-2 ring-sheen">
            <div className="rounded-xl border border-line-soft bg-[#060c19] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.13em] text-faint">Statement of Applicability</p>
                  <p className="mt-1 text-[13px] font-medium text-ink">ISO/IEC 27001:2022</p>
                </div>
                <span className="rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 text-[9px] text-emerald-200">62 of 93</span>
              </div>
              <div className="mt-4 space-y-1.5">
                {[
                  ["A.5.1", "Policies for information security", "Implemented"],
                  ["A.5.15", "Access control", "Implemented"],
                  ["A.5.19", "Supplier relationships", "In progress"],
                  ["A.8.8", "Technical vulnerabilities", "In progress"],
                  ["A.8.15", "Logging", "Not started"],
                ].map(([ref, title, status], index) => (
                  <div key={ref} className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-raised/40 px-2.5 py-2">
                    <span className="font-mono text-[9px] text-brand">{ref}</span>
                    <span className="min-w-0 flex-1 truncate text-[10px] text-slate-300">{title}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[7.5px]",
                        index < 2
                          ? "bg-mint/10 text-emerald-200"
                          : index < 4
                            ? "bg-brand/10 text-sky-200"
                            : "bg-white/5 text-faint",
                      )}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[8.5px] text-faint">
                <span>Owner: Alex Morgan</span>
                <span className="flex items-center gap-1"><LockKeyhole className="size-2.5" /> Tenant-scoped</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-12 max-w-xl">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">How it works</p>
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink md:text-[38px]">
              From blank workspace to audit-ready.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Scope", "Pick the frameworks in play. Auditix gives you the control set, owners and a baseline policy library.", "01"],
              ["Operate", "Run reviews, score risk, upload evidence and close actions. Every change keeps its version history.", "02"],
              ["Prove", "Open the control record, filter to what is implemented and hand the auditor the evidence trail.", "03"],
            ].map(([title, copy, number]) => (
              <div key={number} className="relative rounded-2xl border border-line bg-panel p-6">
                <span className="font-mono text-[11px] text-brand">{number}</span>
                <h3 className="mt-8 text-[16px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{copy}</p>
                <div className="mt-6 h-px bg-gradient-to-r from-brand/50 via-mint/30 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="border-y border-line bg-[#070d1d] py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">Security</p>
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink md:text-[38px]">
              Built like the thing it proves.
            </h2>
            <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-muted">
              Auditix holds the evidence for your controls, so tenant isolation is not a feature checkbox. Every query is scoped to the signed-in workspace and every role is enforced server-side.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                ["Workspace-scoped queries", "Records are only ever read through a verified membership."],
                ["Role-based access", "Admin, member and consultant permissions are enforced on the server."],
                ["Signed sessions", "HttpOnly, SameSite cookies with a rotating JWT secret."],
                ["Evidence integrity", "SHA-256 checksums and encrypted storage in production."],
              ].map(([title, copy]) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-mint/25 bg-mint/10 text-mint">
                    <Check className="size-3" />
                  </span>
                  <span>
                    <span className="block text-[12px] font-medium text-ink">{title}</span>
                    <span className="block text-[11px] text-faint">{copy}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-2 ring-sheen">
            <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
              <span className="flex items-center gap-2 text-[10px] text-faint"><ScanSearch className="size-3" /> Authorization boundary</span>
              <span className="font-mono text-[9px] text-mint">enforced</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[10.5px] leading-[1.8] text-slate-400">
{`const membership = await db.workspaceMember.findUnique({
  where: {
    workspaceId_userId: {
      workspaceId: session.workspace.id,
      userId: session.user.id,
    },
  },
});

if (!membership) throw new ApiError(403);

const policy = await db.policy.findFirst({
  where: { id, workspaceId: session.workspace.id },
});`}
            </pre>
            <div className="flex items-center gap-2 border-t border-line-soft px-4 py-2.5 text-[9.5px] text-faint">
              <span className="size-1.5 rounded-full bg-mint" />
              A record from another workspace is indistinguishable from a missing one.
            </div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="relative overflow-hidden border-t border-line py-20">
        <div className="hero-glow absolute inset-0" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 text-center">
          <img src="/brand/auditix-mark.png" alt="" className="size-14 rounded-2xl border border-brand/20" />
          <h2 className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-ink md:text-[44px]">
            Start with the audit in front of you.
          </h2>
          <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-muted">
            Create a workspace, pick up the baseline policies and see exactly what is missing before the assessor does.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Create your workspace <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign in to the demo
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
