"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RiskActionState } from "@/actions/risks";

export function AddRiskActionForm({
  action,
  riskId,
}: {
  action: (state: RiskActionState, formData: FormData) => Promise<RiskActionState>;
  riskId: string;
}) {
  const [state, formAction] = useActionState<RiskActionState, FormData>(action, null);

  return (
    <form action={formAction} className="mt-3 border-t border-line-soft pt-3">
      <input type="hidden" name="riskId" value={riskId} />
      {state?.error ? <p className="mb-2 text-[10.5px] text-red-300">{state.error}</p> : null}
      {state?.success ? <p className="mb-2 text-[10.5px] text-emerald-300">{state.success}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="title" placeholder="Add a treatment action…" className="flex-1" required aria-label="Treatment action" />
        <Input name="dueDate" type="date" className="sm:w-[150px]" aria-label="Action due date" />
        <SubmitButton variant="secondary" size="sm" pendingText="Adding…">
          <Plus className="size-3.5" /> Add
        </SubmitButton>
      </div>
    </form>
  );
}
