"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { WorkspaceActionState } from "@/actions/workspace";

export function WorkspaceNameForm({
  name,
  action,
  disabled,
}: {
  name: string;
  action: (state: WorkspaceActionState, formData: FormData) => Promise<WorkspaceActionState>;
  disabled?: boolean;
}) {
  const [state, formAction] = useActionState<WorkspaceActionState, FormData>(action, null);

  return (
    <form action={formAction}>
      {state?.error ? <p className="mb-2 text-[10.5px] text-red-300">{state.error}</p> : null}
      {state?.success ? <p className="mb-2 text-[10.5px] text-emerald-300">{state.success}</p> : null}
      <Field label="Workspace name" htmlFor="workspace-name" className="mb-2.5">
        <Input id="workspace-name" name="name" defaultValue={name} disabled={disabled} required />
      </Field>
      {!disabled ? (
        <SubmitButton variant="secondary" size="sm" pendingText="Saving…">
          Save name
        </SubmitButton>
      ) : null}
    </form>
  );
}
