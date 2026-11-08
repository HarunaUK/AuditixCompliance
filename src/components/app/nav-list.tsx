"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookLock,
  Building2,
  CalendarCheck,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  FolderLock,
  Gauge,
  GraduationCap,
  History,
  Network,
  Plug,
  Radar,
  ScanLine,
  Settings2,
  Lock,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Target,
  Truck,
  UserCog,
  UsersRound,
  WalletCards,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: CircleGauge,
  policies: BookLock,
  risks: ShieldCheck,
  evidence: FolderLock,
  controls: ClipboardCheck,
  workspaces: UsersRound,
  billing: WalletCards,
  settings: Settings2,
  audit: FileStack,
  readiness: Gauge,
  activity: History,
  onboarding: Building2,
  context: Network,
  scope: ScanLine,
  methodology: SlidersHorizontal,
  objectives: Target,
  roles: UserCog,
  stage1: BadgeCheck,
  internalAudits: ClipboardList,
  managementReviews: CalendarCheck,
  training: GraduationCap,
  suppliers: Truck,
  incidents: Siren,
  correctiveActions: Wrench,
  integrations: Plug,
  scans: Radar,
  enterprise: Lock,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: string };

/** Routes that are also path prefixes of sibling pages, so they match exactly. */
const EXACT_ROUTES = [
  "/dashboard",
  "/aims",
  "/eu",
  "/soc2",
  "/me",
  "/sg",
  "/pk",
  "/frameworks/iso_42001",
  "/frameworks/iso-27001-2022",
  "/frameworks/soc2",
  "/frameworks/gdpr",
];

/**
 * Every workspace route is dynamic (each render queries Postgres), so fetching
 * every visible link on load would queue up ~40 server renders behind the page
 * you actually opened. Instead each link warms itself once the pointer or
 * keyboard focus lands on it, and pointerdown covers the case where a click
 * arrives before hover had time to finish.
 *
 * After the page settles, the group the visitor is currently in is warmed one
 * route at a time. That is a handful of routes rather than forty, and it is the
 * group they are most likely to click next, so the following clicks come from
 * the client router cache instead of waiting on a server render.
 */
export function NavList({ groups }: { groups: { label: string; items: NavItem[] }[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const warm = (href: string) => router.prefetch(href);

  // Held in a ref so the prefetch effect only restarts on navigation, not on
  // every re-render of the shell.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useEffect(() => {
    const isActive = (href: string) =>
      EXACT_ROUTES.includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    const all = groupsRef.current;
    const activeGroup = all.find((group) => group.items.some((item) => isActive(item.href))) ?? all[0];
    const targets = (activeGroup?.items ?? [])
      .map((item) => item.href)
      .filter((href) => !isActive(href))
      .slice(0, 8);

    let cancelled = false;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (cancelled || index >= targets.length) return;
      router.prefetch(targets[index]);
      index += 1;
      timer = setTimeout(step, 600);
    };

    timer = setTimeout(step, 1800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, router]);

  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0 lg:pr-1" aria-label="Workspace">
      {groups.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-1 lg:mt-5 lg:flex-col lg:first:mt-0">
          <p className="mb-1 hidden px-2.5 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-faint/80 lg:block">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = ICONS[item.icon] ?? CircleGauge;
            const active = EXACT_ROUTES.includes(item.href) ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onMouseEnter={() => warm(item.href)}
                onFocus={() => warm(item.href)}
                onPointerDown={() => warm(item.href)}
                className={cn(
                  "group flex h-8 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-brand/[0.09] text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.14)]"
                    : "text-muted hover:bg-white/[0.04] hover:text-ink",
                )}
              >
                <Icon className={cn("size-[15px]", active ? "text-brand" : "text-faint group-hover:text-slate-300")} strokeWidth={1.7} />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded bg-white/[0.06] px-1.5 font-mono text-[9.5px] text-muted">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
