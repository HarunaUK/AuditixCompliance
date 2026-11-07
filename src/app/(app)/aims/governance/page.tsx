import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, CheckCircle2, CircleDashed, Landmark, Scale, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";

export const metadata: Metadata = { title: "AI governance" };
export const dynamic = "force-dynamic";

export default async function AiGovernancePage() {
  const context = await getWorkspaceContext();
  const [policies, roles, reviews, audits, risks, assessments, systems] = await Promise.all([
    db.policy.findMany({ where: { workspaceId: context.workspace.id }, select: { id: true, title: true, category: true, status: true, reviewDueAt: true }, orderBy: { updatedAt: "desc" } }),
    db.ismsRole.findMany({ where: { workspaceId: context.workspace.id }, orderBy: { createdAt: "asc" } }),
    db.managementReview.findMany({ where: { workspaceId: context.workspace.id }, orderBy: { reviewDate: "desc" }, take: 1 }),
    db.internalAudit.findMany({ where: { workspaceId: context.workspace.id }, orderBy: { auditDate: "desc" }, take: 1 }),
    db.risk.count({ where: { workspaceId: context.workspace.id, category: { contains: "ai", mode: "insensitive" } } }),
    db.aiImpactAssessment.count({ where: { workspaceId: context.workspace.id } }),
    db.aiSystem.count({ where: { workspaceId: context.workspace.id } }),
  ]);

  const aiPolicies = policies.filter((policy) => /ai|artificial/i.test(`${policy.title} ${policy.category}`));
  const approvedAiPolicies = aiPolicies.filter((policy) => policy.status === "APPROVED");
  const checks = [
    { label: "AI policy approved", met: approvedAiPolicies.length > 0, detail: `${approvedAiPolicies.length} approved of ${aiPolicies.length} AI-related`, href: "/policies" },
    { label: "Accountable roles assigned", met: roles.length > 0, detail: `${roles.length} ISMS role${roles.length === 1 ? "" : "s"} defined`, href: "/roles" },
    { label: "AI risks assessed", met: risks > 0, detail: `${risks} risk${risks === 1 ? "" : "s"} tagged AI`, href: "/aims/risks" },
    { label: "Impact assessments recorded", met: assessments > 0 && systems > 0, detail: `${assessments} for ${systems} system${systems === 1 ? "" : "s"}`, href: "/aims/impact" },
    { label: "Management review covers AI", met: reviews.length > 0, detail: reviews[0] ? `last held ${formatDate(reviews[0].reviewDate)}` : "no review recorded", href: "/management-reviews" },
    { label: "Independent assurance", met: audits.length > 0, detail: audits[0] ? `latest audit ${formatDate(audits[0].auditDate)}` : "no internal audit", href: "/internal-audits" },
  ];
  const met = checks.filter((check) => check.met).length;

  return (
    <div>
      <PageHeader
        eyebrow="AI governance · operating model"
        title="AI governance"
        description="Who decides, who is accountable, and how the organisation assures itself that AI is developed and used responsibly."
        actions={
          <Link href="/frameworks/iso_42001" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            ISO 42001 controls <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />

      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-brand/80">
              <Landmark className="size-3" /> Governance operating model
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              AI accountability works best when it is not a separate committee bolted onto security. Use the same ISMS cadence: approved policy,
              named owners, risk assessment, impact review before deployment, then internal audit and management review.
            </p>
            <div className="mt-4 space-y-2">
              {[
                { title: "Policy", body: "One approved AI policy that covers acceptable use, accountability, legal duties and review.", href: "/policies" },
                { title: "Accountability", body: "Named owners for each system, with AI responsibilities written into ISMS roles.", href: "/roles" },
                { title: "Risk and impact", body: "System inventory, risk tier, impact assessment and treatment recorded before go-live.", href: "/aims/systems" },
                { title: "Oversight", body: "Human oversight design documented per system, with monitoring and stop mechanisms.", href: "/aims/systems" },
                { title: "Assurance", body: "Internal audit tests the AI controls; management review signs off the residual risk.", href: "/readiness" },
              ].map((item) => (
                <Link key={item.title} href={item.href} className="group flex gap-3 rounded-xl border border-line-soft bg-panel/60 p-3 transition-colors hover:border-brand/30 hover:bg-brand/[0.04]">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  <div>
                    <p className="text-[11px] font-medium text-ink">{item.title}</p>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-faint">{item.body}</p>
                  </div>
                  <ArrowUpRight className="ml-auto size-3 shrink-0 text-faint group-hover:text-sky-200" />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-start justify-between">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-brand/80">
                <Scale className="size-3" /> Governance checks
              </p>
              <Badge tone={met === checks.length ? "mint" : met > 2 ? "amber" : "red"}>{met}/{checks.length} in place</Badge>
            </div>
            <div className="mt-3 space-y-2">
              {checks.map((check) => (
                <Link key={check.label} href={check.href} className="flex items-start gap-2.5 rounded-xl border border-line-soft bg-panel/60 p-3 transition-colors hover:border-brand/25">
                  {check.met ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-mint" /> : <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-faint" />}
                  <div className="min-w-0">
                    <p className={cn("text-[10.5px] font-medium", check.met ? "text-ink" : "text-muted")}>{check.label}</p>
                    <p className="mt-0.5 text-[9px] text-faint">{check.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">
              <UsersRound className="size-3 text-brand" /> Accountable roles
            </p>
            {roles.length === 0 ? (
              <p className="mt-2 text-[10px] text-faint">No roles defined. Add AI accountability to the roles register.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {roles.slice(0, 5).map((role) => (
                  <div key={role.id} className="text-[10px]">
                    <p className="font-medium text-ink">{role.role}</p>
                    <p className="text-faint">{role.holder ?? "unassigned"} · {role.authority ?? "authority not recorded"}</p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/roles" className="mt-3 inline-flex text-[10px] text-sky-200/75 hover:text-sky-100">Manage roles <ArrowUpRight className="ml-1 size-2.5" /></Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">
              <ShieldCheck className="size-3 text-brand" /> AI policies
            </p>
            {aiPolicies.length === 0 ? (
              <p className="mt-2 text-[10px] leading-relaxed text-faint">
                No AI-specific policy yet. Add one in the policy library, or extend the information security policy with an AI acceptable-use section.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {aiPolicies.slice(0, 5).map((policy) => (
                  <Link key={policy.id} href={`/policies/${policy.id}`} className="block text-[10px] hover:text-sky-200">
                    <p className="font-medium text-ink">{policy.title}</p>
                    <p className="text-faint">{policy.status.replaceAll("_", " ").toLowerCase()} · review {formatDate(policy.reviewDueAt, "not set")}</p>
                  </Link>
                ))}
              </div>
            )}
            <Link href="/policies" className="mt-3 inline-flex text-[10px] text-sky-200/75 hover:text-sky-100">Policy library <ArrowUpRight className="ml-1 size-2.5" /></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
