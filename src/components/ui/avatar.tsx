import { cn, initials } from "@/lib/utils";

const palettes = [
  "from-sky-400 to-blue-600 text-[#04121f]",
  "from-emerald-300 to-teal-600 text-[#04121f]",
  "from-indigo-300 to-violet-600 text-[#10132b]",
  "from-amber-200 to-orange-500 text-[#1d1204]",
  "from-rose-300 to-pink-600 text-[#240711]",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-semibold",
        palettes[hash % palettes.length],
        className,
      )}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
