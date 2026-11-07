import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PolicyForm } from "@/components/policies/policy-form";
import { buttonVariants } from "@/components/ui/button";
import { getWorkspaceContext } from "@/lib/workspace";
import { canWrite } from "@/lib/rbac";
import { controlOptions } from "@/lib/services/controls";
import { getPolicy } from "@/lib/services/policies";
import { updatePolicyAction } from "@/actions/policies";

export const metadata: Metadata = { title: "Edit policy" };
export const dynamic = "force-dynamic";

export default async function EditPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getWorkspaceContext();
  if (!canWrite(context.role)) redirect(`/policies/${id}`);

  const [policy, controls] = await Promise.all([
    getPolicy(context.workspace.id, id),
    controlOptions(context.workspace.id),
  ]);
  if (!policy) notFound();

  return (
    <div>
      <div className="mb-4">
        <Link href={`/policies/${policy.id}`} className="inline-flex items-center gap-1.5 text-[10.5px] text-faint hover:text-ink">
          <ArrowLeft className="size-3" /> Back to policy
        </Link>
      </div>
      <PageHeader
        eyebrow={`Policy · v${policy.version}`}
        title={`Edit ${policy.title}`}
        description="Saving creates a new immutable version and records you as the author. The previous revision remains in the audit trail."
        actions={
          <Link href={`/policies/${policy.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Cancel editing
          </Link>
        }
      />
      <PolicyForm
        action={updatePolicyAction}
        controls={controls}
        mode="edit"
        defaults={{
          id: policy.id,
          title: policy.title,
          category: policy.category,
          summary: policy.summary,
          content: policy.content,
          reviewDueAt: policy.reviewDueAt,
          controlIds: policy.controls.map((row) => row.control.id),
        }}
      />
    </div>
  );
}
