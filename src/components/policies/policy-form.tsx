"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Bold, Eye, Heading2, Italic, Link2, List, ListOrdered, PencilLine, ShieldCheck } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PolicyActionState } from "@/actions/policies";

type ControlOption = {
  control: {
    id: string;
    ref: string;
    title: string;
    category: string;
    framework: { name: string; key: string };
  };
};

type PolicyDefaults = {
  id?: string;
  title?: string;
  category?: string;
  summary?: string | null;
  content?: string;
  reviewDueAt?: Date | string | null;
  controlIds?: string[];
};

const CATEGORIES = ["Governance", "Access", "People", "Operations", "Third party", "Data", "Resilience", "Technology"];

function dateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function PolicyForm({
  action,
  controls,
  defaults,
  mode,
}: {
  action: (state: PolicyActionState, formData: FormData) => Promise<PolicyActionState>;
  controls: ControlOption[];
  defaults?: PolicyDefaults;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState<PolicyActionState, FormData>(action, null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [content, setContent] = useState(defaults?.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insert(before: string, after = "", placeholder = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    });
  }

  const frameworks = Array.from(new Map(controls.map((row) => [row.control.framework.key, row.control.framework.name])).entries());
  const selected = new Set(defaults?.controlIds ?? []);

  return (
    <form action={formAction}>
      {defaults?.id ? <input type="hidden" name="policyId" value={defaults.id} /> : null}
      {state?.error ? (
        <div className="mb-4 rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-[11.5px] text-red-200">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel p-5 ring-sheen">
            <Field label="Policy title" htmlFor="title">
              <Input
                id="title"
                name="title"
                placeholder="e.g. Information Security Policy"
                defaultValue={defaults?.title}
                required
                className="h-10 text-[14px] font-medium"
              />
            </Field>
            <Field label="Short summary" htmlFor="summary" hint="One sentence shown in the policy register.">
              <Input
                id="summary"
                name="summary"
                placeholder="What this policy commits the organization to."
                defaultValue={defaults?.summary ?? ""}
                maxLength={240}
              />
            </Field>

            <div className="mb-4">
              <div className="mb-1.5 flex items-end justify-between gap-2">
                <label htmlFor="content" className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
                  Policy content
                </label>
                <div className="flex rounded-md border border-line bg-canvas p-0.5">
                  {(
                    [
                      { id: "write" as const, label: "Write", icon: PencilLine },
                      { id: "preview" as const, label: "Preview", icon: Eye },
                    ]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                        tab === item.id ? "bg-raised text-ink" : "text-faint hover:text-muted",
                      )}
                    >
                      <item.icon className="size-2.5" /> {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "write" ? (
                <div className="overflow-hidden rounded-xl border border-line bg-canvas/80 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/10">
                  <div className="flex flex-wrap items-center gap-0.5 border-b border-line-soft bg-panel/60 px-2 py-1.5">
                    {[
                      { label: "Heading", icon: Heading2, action: () => insert("## ", "", "Section heading") },
                      { label: "Bold", icon: Bold, action: () => insert("**", "**", "bold text") },
                      { label: "Italic", icon: Italic, action: () => insert("_", "_", "italic text") },
                      { label: "Bullets", icon: List, action: () => insert("- ", "", "List item") },
                      { label: "Numbered", icon: ListOrdered, action: () => insert("1. ", "", "List item") },
                      { label: "Link", icon: Link2, action: () => insert("[", "](https://)", "link text") },
                    ].map((tool) => (
                      <button
                        key={tool.label}
                        type="button"
                        onClick={tool.action}
                        title={tool.label}
                        aria-label={tool.label}
                        className="grid size-6 place-items-center rounded text-faint transition-colors hover:bg-white/[0.06] hover:text-ink"
                      >
                        <tool.icon className="size-3" />
                      </button>
                    ))}
                    <span className="ml-auto font-mono text-[9px] text-faint">Markdown supported</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    id="content"
                    name="content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={22}
                    placeholder="# Purpose&#10;&#10;Describe why this policy exists, who it applies to, and the commitments the organization is making."
                    className="min-h-[420px] w-full resize-y bg-transparent px-4 py-3.5 font-mono text-[11.5px] leading-[1.8] text-slate-200 outline-none placeholder:text-faint/70"
                    required
                  />
                  <div className="flex items-center justify-between border-t border-line-soft px-3 py-1.5 text-[9.5px] text-faint">
                    <span>{content.length.toLocaleString()} characters</span>
                    <span>{content.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
                  </div>
                </div>
              ) : (
                <>
                  <input type="hidden" name="content" value={content} />
                  <div className="min-h-[420px] rounded-xl border border-line bg-canvas/60 px-5 py-4">
                    {content.trim() ? (
                      <Markdown content={content} />
                    ) : (
                      <p className="text-[12px] text-faint">Nothing to preview yet. Switch to Write and draft the policy.</p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft pt-4">
              <Link href={defaults?.id ? `/policies/${defaults.id}` : "/policies"} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Cancel
              </Link>
              <SubmitButton variant="primary" pendingText={mode === "create" ? "Creating draft…" : "Saving revision…"}>
                {mode === "create" ? "Create draft" : "Save new version"}
              </SubmitButton>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Classification</p>
            <Field label="Category" htmlFor="category">
              <Select id="category" name="category" defaultValue={defaults?.category ?? "Governance"}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Next review" htmlFor="reviewDueAt" hint="Review cycles keep the policy defensible." className="mb-0">
              <Input id="reviewDueAt" name="reviewDueAt" type="date" defaultValue={dateInput(defaults?.reviewDueAt)} />
            </Field>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-line-soft bg-canvas/50 px-2.5 py-2 text-[10px] leading-relaxed text-faint">
              <ShieldCheck className="mt-0.5 size-3 shrink-0 text-mint" />
              {mode === "create"
                ? "Drafts are private to this workspace and start at version 1."
                : "Saving creates a new immutable version. Older versions stay available for audit."}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-4 ring-sheen">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Framework mapping</p>
              <span className="font-mono text-[9.5px] text-faint">{selected.size} selected</span>
            </div>
            <p className="mb-3 text-[10px] leading-relaxed text-faint">
              Map this policy to the controls it satisfies. This drives Statement of Applicability coverage.
            </p>
            {controls.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-[10.5px] text-faint">
                No controls are enabled in this workspace yet.
              </p>
            ) : (
              <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
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

        </div>
      </div>
    </form>
  );
}
