import Link from "next/link";
import { ChevronDown, LogOut, Plus, Search, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { ROLE_LABELS } from "@/lib/rbac";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import type { Plan, Role } from "@prisma/client";

export function Topbar({
  workspace,
  user,
  plan,
  role,
}: {
  workspace: { name: string };
  user: { name: string; email: string };
  plan: Plan;
  role: Role;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/75 px-4 backdrop-blur-xl md:px-7">
      <div className="min-w-0">
        <p className="truncate text-[10px] uppercase tracking-[0.13em] text-faint">Workspace</p>
        <p className="truncate text-[12.5px] font-medium text-ink">{workspace.name}</p>
      </div>

      <form action="/policies" className="ml-auto hidden w-full max-w-[260px] items-center gap-2 rounded-lg border border-line bg-panel/60 px-2.5 md:flex">
        <Search className="size-3.5 shrink-0 text-faint" />
        <input
          type="search"
          name="q"
          placeholder="Search policies…"
          aria-label="Search policies"
          className="h-8 w-full bg-transparent text-[12px] text-ink placeholder:text-faint focus:outline-none"
        />
        <kbd className="rounded border border-line bg-raised px-1 font-mono text-[9px] text-faint">↵</kbd>
      </form>

      <Link href="/policies/new" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "ml-auto md:ml-0")}>
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">New policy</span>
      </Link>

      <div className="hidden items-center gap-2 rounded-full border border-line bg-panel/70 px-2.5 py-1 text-[10px] text-muted lg:flex">
        <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        {PLANS[plan].name}
        <span className="text-faint">·</span>
        <span className="capitalize">{role.toLowerCase()}</span>
      </div>

      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
          <Avatar name={user.name} />
          <span className="hidden text-left sm:block">
            <span className="block text-[11.5px] font-medium leading-tight text-ink">{user.name}</span>
            <span className="block text-[10px] leading-tight text-faint">{ROLE_LABELS[role]}</span>
          </span>
          <ChevronDown className="size-3 text-faint transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-xl border border-line bg-[#0d1830] p-1.5 shadow-2xl">
          <div className="border-b border-line-soft px-2.5 py-2">
            <p className="truncate text-[11.5px] font-medium text-ink">{user.name}</p>
            <p className="truncate text-[10px] text-faint">{user.email}</p>
          </div>
          <Link href="/settings" className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] text-muted hover:bg-white/5 hover:text-ink">
            <Settings className="size-3.5" /> Team & settings
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11.5px] text-muted hover:bg-white/5 hover:text-red-300"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}
