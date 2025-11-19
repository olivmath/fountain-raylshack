'use client'

export function OverviewSection() {
  return (
    <div className="mb-8">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">dashboard</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-3xl font-semibold text-white">Operational overview</h2>
        <p className="text-sm text-white/50">Performance snapshot · Updated every 5 min</p>
      </div>
    </div>
  )
}

