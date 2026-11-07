import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PolicyForm } from "@/components/policies/policy-form";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlOptions } from "@/lib/services/controls";
import { createPolicyAction } from "@/actions/policies";

export const metadata: Metadata = { title: "New policy" };
export const dynamic = "force-dynamic";

export default async function NewPolicyPage({ searchParams }: { searchParams: Promise<{ control?: string }> }) {
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect("/policies?error=Read-only+role");

  const params = await searchParams;
  const controls = await controlOptions(context.workspace.id);
  const preselected = controls.find((row) => row.control.id === params.control)?.control.id;
  const reviewDue = new Date();
  reviewDue.setDate(reviewDue.getDate() + 90);

  return (
    <div>
      <PageHeader
        eyebrow="Policy manager"
        title="New policy"
        description="Write the standard in Markdown, map it to the framework controls it satisfies, and start the review cycle."
      />
      <PolicyForm
        action={createPolicyAction}
        controls={controls}
        mode="create"
        defaults={{
          category: "Governance",
          reviewDueAt: reviewDue,
          controlIds: preselected ? [preselected] : [],
          content:
            "# Purpose\n\nDescribe why this policy exists and the outcome it protects.\n\n## Scope\n\nWho and what this policy applies to.\n\n## Policy statements\n\n- Commitment one\n- Commitment two\n- Commitment three\n\n## Roles and responsibilities\n\nWho owns this policy, who operates it, and who reviews it.\n\n## Review\n\nThis policy is reviewed at least annually, or after a material change.",
        }}
      />
    </div>
  );
}
