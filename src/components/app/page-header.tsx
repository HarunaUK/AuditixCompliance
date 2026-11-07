import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand/80">{eyebrow}</p>
        ) : null}
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink md:text-[27px]">{title}</h1>
        {description ? <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
