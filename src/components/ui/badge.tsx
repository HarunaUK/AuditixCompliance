import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, scoreBand, titleCase } from "@/lib/utils";
import type { ControlStatus, PolicyStatus, RiskStatus } from "@prisma/client";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-4",
  {
    variants: {
      tone: {
        neutral: "border-line bg-raised text-muted",
        brand: "border-brand/30 bg-brand/10 text-sky-200",
        mint: "border-mint/30 bg-mint/10 text-emerald-200",
        amber: "border-warning/30 bg-warning/10 text-amber-200",
        red: "border-danger/30 bg-danger/10 text-red-200",
        violet: "border-violet/30 bg-violet/10 text-indigo-200",
        outline: "border-line bg-transparent text-muted",
      },
      dot: { true: "before:size-1.5 before:rounded-full before:bg-current", false: "" },
    },
    defaultVariants: { tone: "neutral", dot: false },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, dot, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, dot }), className)} {...props} />;
}

const policyTone: Record<PolicyStatus, BadgeProps["tone"]> = {
  DRAFT: "neutral",
  IN_REVIEW: "amber",
  APPROVED: "mint",
  RETIRED: "outline",
};

const policyLabel: Record<PolicyStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  RETIRED: "Retired",
};

export function PolicyBadge({ status }: { status: PolicyStatus }) {
  return (
    <Badge tone={policyTone[status]} dot>
      {policyLabel[status]}
    </Badge>
  );
}

const riskTone: Record<RiskStatus, BadgeProps["tone"]> = {
  OPEN: "red",
  MONITORING: "amber",
  MITIGATED: "mint",
  CLOSED: "neutral",
};

export function RiskStatusBadge({ status }: { status: RiskStatus }) {
  return (
    <Badge tone={riskTone[status]} dot>
      {titleCase(status)}
    </Badge>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const band = scoreBand(score);
  const tone = band.tone === "critical" ? "red" : band.tone === "high" ? "amber" : band.tone === "medium" ? "brand" : "mint";
  return (
    <Badge tone={tone}>
      {band.label} · {score}
    </Badge>
  );
}

const controlTone: Record<ControlStatus, BadgeProps["tone"]> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "brand",
  IMPLEMENTED: "mint",
  NOT_APPLICABLE: "outline",
};

const controlLabel: Record<ControlStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  IMPLEMENTED: "Implemented",
  NOT_APPLICABLE: "Not applicable",
};

export function ControlBadge({ status }: { status: ControlStatus }) {
  return (
    <Badge tone={controlTone[status]} dot>
      {controlLabel[status]}
    </Badge>
  );
}
