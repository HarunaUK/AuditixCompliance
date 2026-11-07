export default function AppLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading workspace…</span>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-lg space-y-2.5">
          <div className="h-2.5 w-24 rounded bg-white/[0.06]" />
          <div className="h-7 w-2/3 rounded-md bg-white/[0.07]" />
          <div className="h-3 w-full rounded bg-white/[0.04]" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-white/[0.05]" />
          <div className="h-8 w-24 rounded-lg bg-white/[0.05]" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-line bg-panel p-4">
            <div className="h-2.5 w-24 rounded bg-white/[0.05]" />
            <div className="mt-3 h-6 w-16 rounded bg-white/[0.08]" />
            <div className="mt-3 h-2.5 w-full rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="h-3.5 w-44 rounded bg-white/[0.07]" />
            <div className="mt-2 h-3 w-72 max-w-full rounded bg-white/[0.04]" />
            <div className="mt-6 flex items-center gap-5">
              <div className="size-28 rounded-full border-[10px] border-white/[0.05]" />
              <div className="flex-1 space-y-2.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-2.5 w-full rounded bg-white/[0.04]" />
                ))}
              </div>
            </div>
            <div className="mt-6 h-24 w-full rounded-xl bg-white/[0.03]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-52 rounded-2xl border border-line bg-panel" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-2xl border border-brand/15 bg-brand/[0.04]" />
          <div className="h-56 rounded-2xl border border-line bg-panel" />
        </div>
      </div>
    </div>
  );
}
