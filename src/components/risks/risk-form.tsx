"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn, scoreBand } from "@/lib/utils";
import type { RiskActionState } from "@/actions/risks";

type ControlOption = {
  control: { id: string; ref: string; title: string; category: string; framework: { name: string; key: string } };
};

type RiskDefaults = {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  treatment?: string;
  status?: string;
  dueDate?: Date | string | null;
  ownerId?: string;
  controlIds?: string[];
};

const CATEGORIES = ["People", "Technology", "Third party", "Physical", "Data", "Resilience", "Operations", "Compliance"];

function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function RiskForm({
  action,
  controls,
  members,
  defaults,
  mode,
}: {
  action: (state: RiskActionState, formData: FormData) => Promise<RiskActionState>;
  controls: ControlOption[];
  members: { userId: string; name: string }[];
  defaults?: RiskDefaults;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState<RiskActionState, FormData>(action, null);
  const [likelihood, setLikelihood] = useState(defaults?.likelihood ?? 3);
  const [impact, setImpact] = useState(defaults?.impact ?? 3);
  const band = scoreBand(likelihood * impact);
  const selected = new Set(defaults?.controlIds ?? []);
  const frameworks = Array.from(new Map(controls.map((row) => [row.control.framework.key, row.control.framework.name])).entries());

  const bandStyle = {
    critical: "border-danger/30 bg-danger/[0.08] text-red-200",
    high: "border-warning/30 bg-warning/[0.08] text-amber-200",
    medium: "border-brand/30 bg-brand/[0.08] text-sky-200",
    low: "border-mint/30 bg-mint/[0.08] text-emerald-200",
  }[band.tone];

  return (
    <form action={formAction}>
      {defaults?.id ? <input type="hidden" name="riskId" value={defaults.id} /> : null}
      {state?.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel p-5 ring-sheen">
            <Field label="Risk title" htmlFor="title">
              <Input
                id="title"
                name="title"
                placeholder="e.g. Phishing leads to workforce credential compromise"
                defaultValue={defaults?.title}
                required
                className="h-10 text-[13.5px] font-medium"
              />
            </Field>
            <Field label="Description" htmlFor="description" hint="What could happen, how, and what the business impact would be.">
              <Textarea
                id="description"
                name="description"
                rows={5}
                placeholder="Describe the scenario, the affected systems or people, and the consequence if it happens."
                defaultValue={defaults?.description}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue={defaults?.category ?? "Technology"}>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Owner" htmlFor="ownerId">
                <Select id="ownerId" name="ownerId" defaultValue={defaults?.ownerId}>
                  {members.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Treatment" htmlFor="treatment">
                <Select id="treatment" name="treatment" defaultValue={defaults?.treatment ?? "MITIGATE"}>
                  <option value="MITIGATE">Mitigate</option>
                  <option value="ACCEPT">Accept</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="AVOID">Avoid</option>
                </Select>
              </Field>
              <Field label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue={defaults?.status ?? "OPEN"}>
                  <option value="OPEN">Open</option>
                  <option value="MONITORING">Monitoring</option>
                  <option value="MITIGATED">Mitigated</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </Field>
            </div>
            <Field label="Treatment deadline" htmlFor="dueDate" hint="When the risk owner expects the treatment to be complete." className="mb-0">
              <Input id="dueDate" name="dueDate" type="date" defaultValue={dateInput(defaults?.dueDate)} />
            </Field>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
              <Link href={defaults?.id ? `/risks/${defaults.id}` : "/risks"} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Cancel
              </Link>
              <SubmitButton variant="primary" pendingText={mode === "create" ? "Adding risk…" : "Saving changes…"}>
                {mode === "create" ? "Add to register" : "Save risk"}
                <ArrowRight className="size-3.5" />
              </SubmitButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Risk assessment</p>
            <div className={cn("mt-3 rounded-xl border px-4 py-3", bandStyle)}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <AlertTriangle className="size-3.5" /> {band.label} risk
                </span>
                <span className="font-mono text-[28px] leading-none">{likelihood * impact}</span>
              </div>
              <p className="mt-1 text-[10px] opacity-75">
                Likelihood {likelihood} × Impact {impact}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Likelihood" htmlFor="likelihood" className="mb-0">
                <Select
                  id="likelihood"
                  name="likelihood"
                  value={likelihood}
                  onChange={(event) => setLikelihood(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} · {["Rare", "Unlikely", "Possible", "Likely", "Almost certain"][value - 1]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Impact" htmlFor="impact" className="mb-0">
                <Select id="impact" name="impact" value={impact} onChange={(event) => setImpact(Number(event.target.value))}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value} · {["Negligible", "Minor", "Moderate", "Major", "Severe"][value - 1]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-faint">
              Score is calculated as likelihood × impact on a 5×5 scale. Critical is 20+, high is 12–19.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Linked controls</p>
              <span className="font-mono text-[9.5px] text-faint">{selected.size} selected</span>
            </div>
            <p className="mb-3 text-[10px] leading-relaxed text-faint">
              Record which controls reduce this risk. Linking makes both records more useful to an auditor.
            </p>
            {controls.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-[10.5px] text-faint">
                No controls enabled yet.
              </p>
            ) : (
              <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
                {frameworks.map(([key, name]) => (
                  <div key={key}>
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-sky-200/70">{name}</p>
                    <div className="space-y-0.5">
                      {controls
                        .filter((row) => row.control.framework.key === key)
                        .map((row) => (
                          <label
                            key={row.control.id}
                            className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.035]"
                          >
                            <input
                              type="checkbox"
                              name="controlIds"
                              value={row.control.id}
                              defaultChecked={selected.has(row.control.id)}
                              className="mt-0.5 size-3 shrink-0 rounded border-line bg-canvas accent-sky-400"
                            />
                            <span className="min-w-0">
                              <span className="block font-mono text-[9.5px] text-sky-200/80">{row.control.ref}</span>
                              <span className="block text-[10px] leading-snug text-muted">{row.control.title}</span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-sky-200/80">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Adding a risk records you as the assessor. Treatment actions are added from the risk record.
          </div>
        </div>
      </div>
    </form>
  );
}
