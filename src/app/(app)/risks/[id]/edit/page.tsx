import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RiskForm } from "@/components/risks/risk-form";
import { buttonVariants } from "@/components/ui/button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlOptions } from "@/lib/services/controls";
import { getRisk } from "@/lib/services/risks";
import { listMembers } from "@/lib/services/workspaces";
import { updateRiskAction } from "@/actions/risks";

export const metadata: Metadata = { title: "Edit risk" };
export const dynamic = "force-dynamic";

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(`/risks/${id}`);

  const [risk, controls, members] = await Promise.all([
    getRisk(context.workspace.id, id),
    controlOptions(context.workspace.id),
    listMembers(context.workspace.id),
  ]);
  if (!risk) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={`/risks/${risk.id}`} className="inline-flex items-center gap-1.5 text-[10.5px] text-faint hover:text-ink">
          <ArrowLeft className="size-3" /> Back to risk
        </Link>
      </div>
      <PageHeader
        eyebrow={`Risk · score ${risk.score}`}
        title={`Edit ${risk.title}`}
        description="Changes are saved immediately. Any member of this workspace can see the updated assessment."
        actions={
          <Link href={`/risks/${risk.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Cancel editing
          </Link>
        }
      />
      <RiskForm
        action={updateRiskAction}
        controls={controls}
        members={members.map((member) => ({ userId: member.userId, name: member.user.name }))}
        mode="edit"
        defaults={{
          id: risk.id,
          title: risk.title,
          description: risk.description,
          category: risk.category,
          likelihood: risk.likelihood,
          impact: risk.impact,
          treatment: risk.treatment,
          status: risk.status,
          dueDate: risk.dueDate,
          ownerId: risk.ownerId,
          controlIds: risk.controls.map((row) => row.control.id),
        }}
      />
    </div>
  );
}
