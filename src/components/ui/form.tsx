import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-9 w-full rounded-lg border border-line bg-canvas/80 px-3 text-[12.5px] text-ink placeholder:text-faint transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/10 disabled:opacity-50";

export const textareaClass =
  "w-full rounded-lg border border-line bg-canvas/80 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink placeholder:text-faint transition-colors focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/10 disabled:opacity-50";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
      {hint && !error ? <p className="mt-1 text-[10.5px] text-faint">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(textareaClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn(inputClass, "appearance-none pr-8", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
    </span>
  );
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("size-3.5 rounded border-line bg-canvas accent-sky-400", className)}
      {...props}
    />
  );
}
