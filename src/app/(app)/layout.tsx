import { cookies } from "next/headers";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { resolveMembership, WORKSPACE_COOKIE } from "@/lib/workspace";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { Assistant } from "@/components/app/assistant";
import { aiConfigured } from "@/lib/ai";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const store = await cookies();
  const { memberships, membership } = await resolveMembership(user.id, store.get(WORKSPACE_COOKIE)?.value);

  if (!membership) {
    return (
      <div className="min-h-screen bg-canvas">
        <header className="flex h-16 items-center justify-between border-b border-line px-5">
          <Logo className="h-10" />
          <Link href="/workspaces" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Create a workspace
          </Link>
        </header>
        <main className="mx-auto w-full max-w-3xl px-5 py-14">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <Sidebar
        workspace={membership.workspace}
        memberships={memberships.map((item) => ({ id: item.workspace.id, name: item.workspace.name, role: item.role }))}
      />
      <div className="min-w-0 flex-1">
        <Topbar workspace={membership.workspace} user={user} plan={membership.workspace.plan} role={membership.role} />
        <main className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-7 md:py-8">{children}</main>
      </div>
      <Assistant configured={aiConfigured()} workspaceName={membership.workspace.name} />
    </div>
  );
}
