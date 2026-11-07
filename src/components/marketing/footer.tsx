import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-[#060b18]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-10" />
          <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-faint">
            The compliance workspace for teams that would rather do the work once. Policies, risk, evidence and audit readiness in one place.
          </p>
          <p className="mt-4 text-[10.5px] text-faint">Designed for ISO 27001, Cyber Essentials and the frameworks your customers ask about.</p>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Platform</p>
          <ul className="space-y-2 text-[12px] text-faint">
            <li><Link href="/#platform" className="hover:text-ink">Policy management</Link></li>
            <li><Link href="/#platform" className="hover:text-ink">Risk register</Link></li>
            <li><Link href="/#platform" className="hover:text-ink">Evidence repository</Link></li>
            <li><Link href="/#platform" className="hover:text-ink">Controls &amp; SoA</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Company</p>
          <ul className="space-y-2 text-[12px] text-faint">
            <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link href="/login" className="hover:text-ink">Sign in</Link></li>
            <li><Link href="/register" className="hover:text-ink">Start free</Link></li>
            <li><a href="mailto:security@auditix.app" className="hover:text-ink">Contact</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Trust</p>
          <ul className="space-y-2 text-[12px] text-faint">
            <li>Encrypted at rest &amp; in transit</li>
            <li>Role-based access</li>
            <li>Tenant-isolated data</li>
            <li>Audit history retained</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-[10.5px] text-faint">
          <p>© {new Date().getFullYear()} Auditix. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Data residency: eu-west-2</span>
            <span className="size-1 rounded-full bg-mint" />
            <span>All systems normal</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
