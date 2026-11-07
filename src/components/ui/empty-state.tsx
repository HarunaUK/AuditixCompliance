import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-xl border border-line bg-raised text-brand">
        <Icon className="size-4.5" strokeWidth={1.6} />
      </div>
      <p className="text-[13px] font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-faint">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
