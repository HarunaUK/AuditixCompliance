"use client";

import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { switchWorkspaceAction } from "@/actions/workspace";
import type { Plan } from "@prisma/client";

export function WorkspaceSwitcher({
  workspace,
  memberships,
}: {
  workspace: { id: string; name: string; plan: Plan };
  memberships: { id: string; name: string; role: string }[];
}) {
  return (
    <div className="rounded-xl border border-line bg-raised/70 p-2">
      <form action={switchWorkspaceAction}>
        <label className="mb-1 flex items-center justify-between px-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-faint">
          Workspace
          <ChevronsUpDown className="size-3" />
        </label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-brand" />
          <select
            name="workspaceId"
            defaultValue={workspace.id}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="h-8 w-full appearance-none rounded-lg border border-line bg-canvas/80 pl-7 pr-6 text-[12px] font-medium text-ink focus:border-brand/50 focus:outline-none"
            aria-label="Switch workspace"
          >
            {memberships.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-faint" />
        </div>
        <noscript>
          <button className="mt-1 text-[10px] text-brand">Switch</button>
        </noscript>
      </form>
      <Link
        href="/workspaces"
        className="mt-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10.5px] text-faint transition-colors hover:text-sky-200"
      >
        <Plus className="size-3" /> New or manage workspaces
      </Link>
    </div>
  );
}
