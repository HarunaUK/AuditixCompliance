import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { NavList, type NavItem } from "@/components/app/nav-list";
import { PLANS } from "@/lib/plans";
import type { Role } from "@prisma/client";

type SidebarProps = {
  workspace: { id: string; name: string; plan: keyof typeof PLANS };
  memberships: { id: string; name: string; role: Role }[];
};

export function Sidebar({ workspace, memberships }: SidebarProps) {
  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: "Workspace",
      items: [
        { href: "/clients", label: "My clients", icon: "workspaces", badge: String(memberships.length) },
        { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      ],
    },
    {
      label: "Compliance",
      items: [
        { href: "/onboarding", label: "Onboarding", icon: "onboarding" },
        { href: "/context", label: "Context & Parties", icon: "context" },
        { href: "/scope", label: "Scope Statement", icon: "scope" },
        { href: "/policies", label: "Policies", icon: "policies" },
        { href: "/soa", label: "Statement of Appl.", icon: "audit" },
        { href: "/risks", label: "Risk Register", icon: "risks" },
        { href: "/risk-methodology", label: "Risk Methodology", icon: "methodology" },
        { href: "/bia", label: "Business Impact", icon: "readiness" },
        { href: "/assets", label: "Assets", icon: "controls" },
        { href: "/evidence", label: "Evidence", icon: "evidence" },
        { href: "/integrations", label: "Evidence Automation", icon: "integrations" },
      ],
    },
    {
      label: "Processes",
      items: [
        { href: "/controls", label: "Controls", icon: "controls" },
        { href: "/objectives", label: "Objectives", icon: "objectives" },
        { href: "/roles", label: "Roles & Resp.", icon: "roles" },
        { href: "/measurements", label: "Measurement", icon: "readiness" },
        { href: "/stage1-check", label: "Stage 1 Check", icon: "stage1" },
        { href: "/internal-audit", label: "Internal Audit", icon: "internalAudits" },
        { href: "/management-review", label: "Mgmt Review", icon: "managementReviews" },
        { href: "/incidents", label: "Incidents", icon: "incidents" },
        { href: "/corrective-actions", label: "Corrective Actions", icon: "correctiveActions" },
        { href: "/training", label: "Training", icon: "training" },
        { href: "/vendors", label: "Vendors", icon: "suppliers" },
      ],
    },
    {
      label: "Offensive",
      items: [
        { href: "/scans", label: "Vuln Scans", icon: "scans" },
        { href: "/cyber-essentials", label: "Cyber Essentials", icon: "stage1" },
        { href: "/cyber-essentials?tab=plus", label: "CE Plus", icon: "stage1" },
      ],
    },
    {
      label: "AI Governance",
      items: [
        { href: "/aims", label: "AI Management", icon: "dashboard" },
        { href: "/aims/soa", label: "AI SoA", icon: "audit" },
        { href: "/aims/systems", label: "AI Systems", icon: "controls" },
        { href: "/aims/impact-assessments", label: "Impact Assessments", icon: "stage1" },
        { href: "/aims/risks", label: "AI Risks", icon: "risks" },
        { href: "/aims/governance", label: "AI Governance", icon: "roles" },
        { href: "/aims/eu-ai-act", label: "EU AI Act", icon: "policies" },
        { href: "/frameworks/iso_42001", label: "42001 Controls", icon: "controls" },
      ],
    },
    {
      label: "SOC 2",
      items: [
        { href: "/soc2", label: "SOC 2 Overview", icon: "readiness" },
        { href: "/frameworks/soc2", label: "SOC 2 Criteria", icon: "audit" },
      ],
    },
    {
      label: "EU Compliance",
      items: [
        { href: "/eu", label: "EU Overview", icon: "readiness" },
        { href: "/gdpr", label: "GDPR", icon: "policies" },
        { href: "/frameworks/gdpr", label: "GDPR Controls", icon: "audit" },
        { href: "/aims/eu-ai-act", label: "EU AI Act", icon: "stage1" },
      ],
    },
    {
      label: "Middle East",
      items: [{ href: "/middle-east", label: "ME Overview", icon: "readiness" }],
    },
    {
      label: "Singapore / APAC",
      items: [{ href: "/apac", label: "APAC Overview", icon: "readiness" }],
    },
    {
      label: "Pakistan",
      items: [{ href: "/pakistan", label: "PK Overview", icon: "readiness" }],
    },
    {
      label: "Account",
      items: [
        { href: "/reports", label: "Reports & exports", icon: "audit" },
        { href: "/settings", label: "Settings", icon: "settings" },
        { href: "/enterprise", label: "Enterprise & SSO", icon: "enterprise" },
        { href: "/billing", label: "Billing", icon: "billing" },
      ],
    },
  ];

  return (
    <aside className="relative z-30 border-b border-line bg-[#060b18]/95 px-4 py-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[248px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-3 lg:py-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" aria-label="Auditix dashboard">
          <Logo className="h-9 lg:h-10" />
        </Link>
        <span className="rounded-full border border-brand/20 bg-brand/[0.07] px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-sky-200 lg:hidden">
          {PLANS[workspace.plan].name}
        </span>
      </div>

      <div className="mt-3 lg:mt-5">
        <WorkspaceSwitcher
          workspace={workspace}
          memberships={memberships.map((item) => ({ id: item.id, name: item.name, role: item.role }))}
        />
      </div>

      <div className="mt-3 lg:mt-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <NavList groups={groups} />
      </div>

      <div className="mt-4 hidden border-t border-line-soft pt-3 lg:block">
        <div className="flex items-center justify-between px-1 text-[9.5px] text-faint">
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-mint" /> {PLANS[workspace.plan].name} plan
          </span>
          <Link href="/billing" className="flex items-center gap-0.5 transition-colors hover:text-sky-200">
            Manage <ArrowUpRight className="size-2.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
