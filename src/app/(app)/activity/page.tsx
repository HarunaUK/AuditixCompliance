import Link from "next/link";
import type { Metadata } from "next";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookLock,
  Bot,
  Boxes,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Filter,
  FolderLock,
  Gauge,
  GraduationCap,
  Network,
  Plug,
  ScanLine,
  Search,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Target,
  Truck,
  UserCog,
  Wrench,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/avatar";
import { getWorkspaceContext } from "@/lib/workspace";
import { ENTITY_TYPES, activityActors, activityStats, countActivity, isEntityType, listActivity } from "@/lib/services/activity";
import { cn, formatDate } from "@/lib/utils";
import type { EntityType } from "@/lib/services/activity";

export const metadata: Metadata = { title: "Audit trail" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 40;

const entityConfig: Record<EntityType, { icon: LucideIcon; className: string; tone: "brand" | "amber" | "mint" | "violet" | "red" | "neutral" }> = {
  Policy: { icon: BookLock, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  Risk: { icon: ShieldCheck, className: "border-warning/25 bg-warning/10 text-amber-300", tone: "amber" },
  Evidence: { icon: FolderLock, className: "border-mint/25 bg-mint/10 text-emerald-300", tone: "mint" },
  Control: { icon: ClipboardCheck, className: "border-violet/25 bg-violet/10 text-indigo-300", tone: "violet" },
  Workspace: { icon: Building2, className: "border-line bg-raised text-muted", tone: "neutral" },
  Member: { icon: UsersRound, className: "border-line bg-raised text-muted", tone: "neutral" },
  Profile: { icon: Building2, className: "border-line bg-raised text-muted", tone: "neutral" },
  Context: { icon: Network, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  Scope: { icon: ScanLine, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  Methodology: { icon: SlidersHorizontal, className: "border-warning/25 bg-warning/10 text-amber-300", tone: "amber" },
  Objective: { icon: Target, className: "border-mint/25 bg-mint/10 text-emerald-300", tone: "mint" },
  IsmsRole: { icon: UserCog, className: "border-violet/25 bg-violet/10 text-indigo-300", tone: "violet" },
  InternalAudit: { icon: ClipboardList, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  ManagementReview: { icon: CalendarCheck, className: "border-violet/25 bg-violet/10 text-indigo-300", tone: "violet" },
  Training: { icon: GraduationCap, className: "border-mint/25 bg-mint/10 text-emerald-300", tone: "mint" },
  Supplier: { icon: Truck, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  Incident: { icon: Siren, className: "border-danger/25 bg-danger/10 text-red-300", tone: "red" },
  CorrectiveAction: { icon: Wrench, className: "border-warning/25 bg-warning/10 text-amber-300", tone: "amber" },
  Asset: { icon: Boxes, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  Impact: { icon: Activity, className: "border-warning/25 bg-warning/10 text-amber-300", tone: "amber" },
  Measurement: { icon: Gauge, className: "border-mint/25 bg-mint/10 text-emerald-300", tone: "mint" },
  Scan: { icon: ScanLine, className: "border-violet/25 bg-violet/10 text-indigo-300", tone: "violet" },
  Integration: { icon: Plug, className: "border-brand/25 bg-brand/10 text-sky-300", tone: "brand" },
  AiSystem: { icon: Bot, className: "border-violet/25 bg-violet/10 text-indigo-300", tone: "violet" },
};

function eventHref(entityType: string, entityId: string | null) {
  switch (entityType) {
    case "Policy":
      return entityId ? `/policies/${entityId}` : "/policies";
    case "Risk":
      return entityId ? `/risks/${entityId}` : "/risks";
    case "Evidence":
      return "/evidence";
    case "Control":
      return "/soa";
    case "Workspace":
    case "Member":
      return "/settings";
    case "Profile":
      return "/onboarding";
    case "Context":
      return "/context";
    case "Scope":
      return "/scope";
    case "Methodology":
      return "/methodology";
    case "Objective":
      return "/objectives";
    case "IsmsRole":
      return "/roles";
    case "InternalAudit":
      return "/internal-audits";
    case "ManagementReview":
      return "/management-reviews";
    case "Training":
      return "/training";
    case "Supplier":
      return "/suppliers";
    case "Incident":
      return entityId ? `/incidents/${entityId}` : "/incidents";
    case "CorrectiveAction":
      return "/corrective-actions";
    case "Asset":
      return "/assets";
    case "Impact":
      return "/bia";
    case "Measurement":
      return "/measurements";
    case "Scan":
      return "/scans";
    case "Integration":
      return "/integrations";
    case "AiSystem":
      return "/aims/systems";
    default:
      return "/dashboard";
  }
}

function dayLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - value.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatDate(date);
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entityType?: string; actor?: string; page?: string }>;
}) {
  const params = await searchParams;
  const context = await getWorkspaceContext();
  const entityType: EntityType | "ALL" = isEntityType(params.entityType) ? params.entityType : "ALL";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const filters = { entityType, actorName: params.actor || undefined, q: params.q || undefined };

  const [events, total, actors, stats] = await Promise.all([
    listActivity(context.workspace.id, { ...filters, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    countActivity(context.workspace.id, filters),
    activityActors(context.workspace.id),
    activityStats(context.workspace.id),
  ]);

  const filtered = Boolean(params.q || params.actor || (params.entityType && params.entityType !== "ALL"));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const groups = Array.from(
    events.reduce((map, event) => {
      const key = dayLabel(event.createdAt);
      const entry = map.get(key) ?? [];
      entry.push(event);
      map.set(key, entry);
      return map;
    }, new Map<string, typeof events>()),
  );

  const pageHref = (next: number) => {
    const search = new URLSearchParams();
    if (params.q) search.set("q", params.q);
    if (params.actor) search.set("actor", params.actor);
    if (params.entityType && params.entityType !== "ALL") search.set("entityType", params.entityType);
    search.set("page", String(next));
    return `/activity?${search.toString()}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Audit trail"
        description="An append-only record of who changed what in this workspace, with the decision behind it. This is the log an auditor samples when they test operating effectiveness."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Recorded events", value: stats.total },
          { label: "Last 30 days", value: stats.recent },
          { label: "Contributors", value: actors.length },
          { label: "Evidence events", value: stats.byType.Evidence ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-panel px-3.5 py-3 ring-sheen">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-faint">{stat.label}</p>
            <p className="mt-1.5 font-mono text-[21px] leading-none text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <form className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
              <Input name="q" defaultValue={params.q ?? ""} placeholder="Search the trail…" className="pl-8" aria-label="Search activity" />
            </div>
            <Select name="entityType" defaultValue={entityType} className="w-auto min-w-[140px]" aria-label="Filter by entity">
              <option value="ALL">All records</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Select name="actor" defaultValue={params.actor ?? ""} className="w-auto min-w-[150px]" aria-label="Filter by person">
              <option value="">Everyone</option>
              {actors.map((actor) => (
                <option key={actor.name} value={actor.name}>
                  {actor.name}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <Filter className="size-3.5" /> Filter
            </button>
            {filtered ? (
              <Link href="/activity" className="px-1 text-[10.5px] text-faint hover:text-ink">
                Clear
              </Link>
            ) : null}
            <span className="ml-auto font-mono text-[9.5px] text-faint">
              {total} event{total === 1 ? "" : "s"}
            </span>
          </form>

          {events.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ClipboardCheck}
                title={filtered ? "No events match those filters" : "The trail is empty"}
                description={
                  filtered
                    ? "Try another search or clear the record and person filters."
                    : "Change a policy, risk, control decision or evidence item and the event will appear here with your name on it."
                }
                action={
                  filtered ? (
                    <Link href="/activity" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                      Clear filters
                    </Link>
                  ) : null
                }
              />
            </div>
          ) : (
            <div>
              {groups.map(([label, items]) => (
                <section key={label}>
                  <div className="border-y border-line-soft bg-canvas/30 px-4 py-1.5 first:border-t-0">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-brand/80">{label}</span>
                  </div>
                  <ol className="divide-y divide-line-soft">
                    {items.map((event) => {
                      const config = entityConfig[event.entityType as EntityType] ?? entityConfig.Workspace;
                      const Icon = config.icon;
                      return (
                        <li key={event.id}>
                          <Link
                            href={eventHref(event.entityType, event.entityId)}
                            className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.018]"
                          >
                            <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border", config.className)}>
                              <Icon className="size-3.5" strokeWidth={1.8} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] leading-snug text-ink">{event.summary}</p>
                              {event.detail ? <p className="mt-0.5 truncate text-[10px] text-faint">{event.detail}</p> : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <div className="hidden items-center gap-1.5 sm:flex">
                                <Avatar name={event.actorName} className="size-5" />
                                <span className="max-w-[110px] truncate text-[10px] text-muted">{event.actorName}</span>
                              </div>
                              <Badge tone={config.tone}>{event.entityType}</Badge>
                              <span className="w-[42px] text-right font-mono text-[9.5px] text-faint">
                                {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(event.createdAt)}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}

          {pages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
              <span className="text-[10px] text-faint">
                Page {page} of {pages}
              </span>
              <div className="flex gap-1.5">
                <Link
                  href={pageHref(Math.max(1, page - 1))}
                  aria-disabled={page === 1}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), page === 1 && "pointer-events-none opacity-40")}
                >
                  <ArrowLeft className="size-3.5" /> Newer
                </Link>
                <Link
                  href={pageHref(Math.min(pages, page + 1))}
                  aria-disabled={page === pages}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), page === pages && "pointer-events-none opacity-40")}
                >
                  Older <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="mt-3 text-[10px] leading-relaxed text-faint">
        Events are written by the server whenever a record changes, including the actor, workspace and timestamp. They are scoped to
        this workspace and cannot be edited from the app.
      </p>
    </div>
  );
}
