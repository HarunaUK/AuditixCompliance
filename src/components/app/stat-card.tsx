import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "mint" | "amber" | "violet";
  className?: string;
}) {
  const tones = {
    brand: "border-brand/25 bg-brand/10 text-sky-300",
    mint: "border-mint/25 bg-mint/10 text-emerald-300",
    amber: "border-warning/25 bg-warning/10 text-amber-300",
    violet: "border-violet/25 bg-violet/10 text-indigo-300",
  };

  return (
    <div className={cn("rounded-2xl border border-line bg-panel p-4 ring-sheen", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg border", tones[tone])}>
          <Icon className="size-[15px]" strokeWidth={1.7} />
        </span>
      </div>
      <p className="mt-2 font-mono text-[25px] font-medium leading-none tracking-[-0.04em] text-ink">{value}</p>
      {hint ? <p className="mt-2 text-[11px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}
