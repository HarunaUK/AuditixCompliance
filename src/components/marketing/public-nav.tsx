import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function PublicNav() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-canvas/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" aria-label="Auditix home">
          <Logo className="h-10" />
        </Link>
        <nav className="ml-2 hidden items-center gap-6 text-[12.5px] text-muted md:flex">
          <Link href="/#platform" className="transition-colors hover:text-ink">Platform</Link>
          <Link href="/#frameworks" className="transition-colors hover:text-ink">Frameworks</Link>
          <Link href="/#security" className="transition-colors hover:text-ink">Security</Link>
          <Link href="/pricing" className="transition-colors hover:text-ink">Pricing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}>
              Open workspace <ArrowRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-2 text-[12.5px] text-muted transition-colors hover:text-ink sm:block">
                Sign in
              </Link>
              <Link href="/register" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0")}>
                Start free <ArrowRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
