import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { RiskForm } from "@/components/risks/risk-form";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlOptions } from "@/lib/services/controls";
import { listMembers } from "@/lib/services/workspaces";
import { createRiskAction } from "@/actions/risks";

export const metadata: Metadata = { title: "New risk" };
export const dynamic = "force-dynamic";

export default async function NewRiskPage() {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/risks?error=Read-only+role");

  const [controls, members] = await Promise.all([controlOptions(context.workspace.id), listMembers(context.workspace.id)]);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return (
    <div>
      <PageHeader
        eyebrow="Risk management"
        title="Add a risk"
        description="Record the scenario, assess likelihood and impact, and assign an owner. Treatment actions can be added once the risk exists."
      />
      <RiskForm
        action={createRiskAction}
        controls={controls}
        members={members.map((member) => ({ userId: member.userId, name: member.user.name }))}
        mode="create"
        defaults={{ ownerId: context.user.id, dueDate }}
      />
    </div>
  );
}
