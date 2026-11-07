import { Check, FileCheck2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_490px]">
      <aside className="hero-glow relative hidden flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
        <div className="brand-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <Logo className="h-11" />
          <div className="mt-16 max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand">The compliance workspace</p>
            <h2 className="mt-4 text-[36px] font-semibold leading-[1.12] tracking-[-0.04em] text-ink">
              Audit readiness,
              <br />
              without the scavenger hunt.
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
              Policies, risks, evidence and control coverage in one tenant-scoped workspace. The same work answers every framework.
            </p>
          </div>
          <div className="mt-10 space-y-3.5">
            {[
              [ShieldCheck, "Control coverage across ISO 27001 and Cyber Essentials"],
              [FileCheck2, "Versioned policies with review dates and owners"],
              [Check, "Evidence linked to the control it proves"],
            ].map(([Icon, text]) => {
              const Component = Icon as typeof ShieldCheck;
              return (
                <div key={String(text)} className="flex items-center gap-3 text-[12px] text-muted">
                  <span className="grid size-7 place-items-center rounded-lg border border-line bg-panel/60 text-brand">
                    <Component className="size-3.5" strokeWidth={1.7} />
                  </span>
                  {text as string}
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative flex items-center justify-between text-[10px] text-faint">
          <span>Auditix · IT audit &amp; compliance</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-mint" /> eu-west-2</span>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[370px]">
          <div className="mb-8 lg:hidden">
            <Logo className="h-10" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
