import type { Plan } from "@prisma/client";

export type PlanDefinition = {
  id: Plan;
  name: string;
  price: number;
  cadence: string;
  tagline: string;
  seats: number;
  workspaces: number;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Record<Plan, PlanDefinition> = {
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    price: 199,
    cadence: "per month",
    tagline: "For a single team getting audit-ready.",
    seats: 10,
    workspaces: 1,
    features: ["ISO 27001 + Cyber Essentials", "Policies, risks and evidence", "Quarterly access reviews", "Auditor-ready export", "Email support"],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 499,
    cadence: "per month",
    tagline: "For scaling companies with multiple frameworks.",
    seats: 25,
    workspaces: 3,
    features: ["Everything in Growth", "Unlimited frameworks", "Readiness gate + SoA", "Supplier and incident workflows", "Priority support"],
    highlight: true,
  },
  CONSULTANT: {
    id: "CONSULTANT",
    name: "Consultant",
    price: 600,
    cadence: "per month",
    tagline: "For practices running multiple client workspaces.",
    seats: 10,
    workspaces: 20,
    features: ["Everything in Pro", "Up to 20 client workspaces", "Cross-client portfolio view", "Client-branded exports", "Dedicated onboarding"],
  },
};

export const PLAN_ORDER: Plan[] = ["GROWTH", "PRO", "CONSULTANT"];

export function planFor(plan: Plan) {
  return PLANS[plan];
}
