"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { WorkspaceActionState } from "@/actions/workspace";

export function AddMemberForm({
  action,
}: {
  action: (state: WorkspaceActionState, formData: FormData) => Promise<WorkspaceActionState>;
}) {
  const [state, formAction] = useActionState<WorkspaceActionState, FormData>(action, null);

  return (
    <form action={formAction} className="border-t border-line-soft px-5 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Invite a member</p>
      {state?.error ? (
        <div className="mb-3 rounded-lg border border-danger/25 bg-danger/[0.06] px-2.5 py-2 text-[10.5px] leading-relaxed text-red-200">
          {state.error}
        </div>
      ) : null}
      {state?.success ? (
        <div className="mb-3 rounded-lg border border-mint/25 bg-mint/[0.06] px-2.5 py-2 text-[10.5px] leading-relaxed text-emerald-200">
          {state.success}
        </div>
      ) : null}
      <div className="grid gap-2.5 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
        <Field label="Work email" htmlFor="member-email" className="mb-0">
          <Input id="member-email" name="email" type="email" placeholder="name@company.com" required />
        </Field>
        <Field label="Role" htmlFor="member-role" className="mb-0">
          <Select id="member-role" name="role" defaultValue="MEMBER">
            <option value="MEMBER">Member</option>
            <option value="CONSULTANT">Consultant</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        <Field label="Title (optional)" htmlFor="member-title" className="mb-0">
          <Input id="member-title" name="title" placeholder="Compliance lead" />
        </Field>
        <div className="flex items-end">
          <SubmitButton variant="primary" size="sm" pendingText="Adding…" className="w-full sm:w-auto">
            <UserPlus className="size-3.5" /> Add
          </SubmitButton>
        </div>
      </div>
      <p className="mt-2 text-[9.5px] text-faint">They need an existing Auditix account. Roles can be changed at any time.</p>
    </form>
  );
}
