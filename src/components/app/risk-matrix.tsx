import { cn } from "@/lib/utils";

type MatrixCell = { likelihood: number; impact: number; count: number; score: number };

const tone = (score: number) => {
  if (score >= 20) return "border-danger/35 bg-danger/[0.16] text-red-200";
  if (score >= 12) return "border-warning/30 bg-warning/[0.12] text-amber-200";
  if (score >= 6) return "border-brand/25 bg-brand/[0.09] text-sky-200";
  return "border-mint/25 bg-mint/[0.08] text-emerald-200";
};

export function RiskMatrix({ data, compact = false }: { data: MatrixCell[]; compact?: boolean }) {
  const lookup = new Map(data.map((cell) => [`${cell.likelihood}-${cell.impact}`, cell.count]));

  if (compact) {
    return (
      <div className="grid grid-cols-5 gap-[3px]">
        {[5, 4, 3, 2, 1].map((likelihood) => (
          <div key={likelihood} className="contents">
            {[1, 2, 3, 4, 5].map((impact) => {
              const count = lookup.get(`${likelihood}-${impact}`) ?? 0;
              return (
                <div
                  key={impact}
                  title={`${count} risk${count === 1 ? "" : "s"}`}
                  className={cn(
                    "flex aspect-square min-h-3 items-center justify-center rounded-[3px] border font-mono text-[6.5px]",
                    tone(likelihood * impact),
                    count === 0 && "opacity-40",
                  )}
                >
                  {count || ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-[320px]">
      <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-faint">
        <span>Likelihood ↑</span>
        <span>Impact →</span>
      </div>
      <div className="grid grid-cols-[22px_repeat(5,1fr)] gap-1">
        {[5, 4, 3, 2, 1].map((likelihood) => (
          <div key={likelihood} className="contents">
            <div className="flex items-center justify-center font-mono text-[10px] text-faint">{likelihood}</div>
            {[1, 2, 3, 4, 5].map((impact) => {
              const count = lookup.get(`${likelihood}-${impact}`) ?? 0;
              const score = likelihood * impact;
              return (
                <div
                  key={impact}
                  title={`${count} risk${count === 1 ? "" : "s"} · likelihood ${likelihood}, impact ${impact}`}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md border font-mono text-[11px] transition-colors",
                    tone(score),
                    count === 0 && "opacity-40",
                  )}
                >
                  {count || "·"}
                </div>
              );
            })}
          </div>
        ))}
        <div />
        {[1, 2, 3, 4, 5].map((impact) => (
          <div key={impact} className="text-center font-mono text-[10px] text-faint">
            {impact}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[9.5px] text-faint">
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-danger/50" /> Critical</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-warning/50" /> High</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-brand/50" /> Medium</span>
        <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-mint/50" /> Low</span>
      </div>
    </div>
  );
}
