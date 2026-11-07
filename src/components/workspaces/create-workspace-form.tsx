"use client";

import { useActionState } from "react";
import { Building2, Plus } from "lucide-react";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { WorkspaceActionState } from "@/actions/workspace";

export function CreateWorkspaceForm({
  action,
}: {
  action: (state: WorkspaceActionState, formData: FormData) => Promise<WorkspaceActionState>;
}) {
  const [state, formAction] = useActionState<WorkspaceActionState, FormData>(action, null);

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        <Building2 className="size-3.5 text-brand" /> New workspace
      </p>
      <p className="mt-1 text-[10px] leading-relaxed text-faint">
        Create a separate tenant for a client or business unit. Policies, risks and evidence never cross the boundary.
      </p>
      {state?.error ? <p className="mt-2 text-[10.5px] text-red-300">{state.error}</p> : null}
      <div className="mt-3">
        <Field label="Organization name" htmlFor="new-workspace-name" className="mb-2">
          <Input id="new-workspace-name" name="name" placeholder="e.g. Acme Health Ltd" required />
        </Field>
        <SubmitButton variant="primary" className="w-full" pendingText="Creating…">
          <Plus className="size-3.5" /> Create workspace
        </SubmitButton>
      </div>
    </form>
  );
}
