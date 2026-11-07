import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CreditCard, Download, FileText, Info, Receipt, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PlanSelector } from "@/components/billing/plan-selector";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWorkspaceContext } from "@/lib/workspace";
import { canManageWorkspace } from "@/lib/rbac";
import { PLANS } from "@/lib/plans";
import { workspaceStats } from "@/lib/services/workspaces";
import { changePlanAction } from "@/actions/workspace";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const context = await getWorkspaceContext();
  const plan = PLANS[context.plan];
  const stats = await workspaceStats(context.workspace.id);
  const admin = canManageWorkspace(context.role);
  const nextInvoice = new Date();
  nextInvoice.setMonth(nextInvoice.getMonth() + 1);
  const seatsUsed = `${stats.members} / ${plan.seats}`;
  const workspacesUsed = `${context.memberships.length} / ${plan.workspaces}`;

  return (
    <div>
      <PageHeader
        eyebrow="Workspace billing"
        title="Billing & plan"
        description="Manage the subscription for this workspace. This demo runs in test mode: plans switch immediately and no payment is collected."
        actions={
          <Link href="/pricing" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Compare plans
          </Link>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-[linear-gradient(140deg,rgba(56,189,248,0.10),rgba(11,19,43,0)_60%)] p-4 ring-sheen md:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-sky-200/80">Current subscription</p>
              <div className="mt-1.5 flex items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">{plan.name}</h2>
                <Badge tone="mint" dot>
                  Active
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted">{plan.tagline}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[26px] leading-none text-ink">${plan.price}</p>
              <p className="mt-1 text-[9.5px] text-faint">per month · USD</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 border-t border-white/5 pt-3 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                <UsersRound className="size-2.5" /> Seats
              </p>
              <p className="mt-1 text-[11px] text-ink">{seatsUsed}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                <WalletCards className="size-2.5" /> Workspaces
              </p>
              <p className="mt-1 text-[11px] text-ink">{workspacesUsed}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint">
                <Receipt className="size-2.5" /> Next invoice
              </p>
              <p className="mt-1 text-[11px] text-ink">{formatDate(nextInvoice)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
          <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-faint">
            <Info className="size-3" /> Test mode
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            No card is on file. Plan changes are written to this workspace immediately so you can test entitlements and copy.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[9.5px] text-faint">
            <ShieldCheck className="size-3 text-mint" /> Billing actions are admin-only
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Available plans</h2>
            <p className="mt-0.5 text-[11px] text-faint">
              {admin ? "Switch whenever you like. The change is reflected across the workspace shell immediately." : "Only workspace admins can change the plan."}
            </p>
          </div>
        </div>
        <PlanSelector currentPlan={context.plan} action={changePlanAction} disabled={!admin} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Billing history</CardTitle>
              <p className="mt-0.5 text-[11px] text-faint">Mock invoices for this demo workspace.</p>
            </div>
            <Receipt className="size-4 text-faint" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead>
                  <tr className="border-b border-line-soft text-[9px] uppercase tracking-[0.1em] text-faint">
                    <th className="py-2 font-semibold">Invoice</th>
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Status</th>
                    <th className="py-2 text-right font-semibold">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft text-[10.5px]">
                  {[0, 1, 2].map((offset) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - offset);
                    return (
                      <tr key={offset}>
                        <td className="py-2.5 font-mono text-[10px] text-muted">INV-{date.getFullYear()}{String(date.getMonth() + 1).padStart(2, "0")}-A1</td>
                        <td className="py-2.5 text-muted">{formatDate(date)}</td>
                        <td className="py-2.5 text-ink">${plan.price}.00</td>
                        <td className="py-2.5">
                          <Badge tone="mint" dot>
                            Paid
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[9.5px] text-faint">
                            <Download className="size-2.5" /> Demo
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
              <CreditCard className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-xl border border-line bg-canvas/50 px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-9 place-items-center rounded border border-line bg-raised text-[7px] font-semibold text-muted">VISA</span>
                  <p className="font-mono text-[11px] text-ink">•••• 4242</p>
                  <Badge tone="neutral">Test</Badge>
                </div>
                <p className="mt-2 text-[9.5px] text-faint">Expires 08 / 2029 · Alex Morgan</p>
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-faint">
                Test card only. No charge will be made while the workspace is in demo mode.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan entitlements</CardTitle>
              <FileText className="size-4 text-faint" />
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {plan.features.map((feature) => (
                <p key={feature} className="flex items-start gap-2 text-[10.5px] leading-snug text-muted">
                  <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-mint" /> {feature}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
