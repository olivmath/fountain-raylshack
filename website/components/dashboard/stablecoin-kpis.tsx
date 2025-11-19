'use client'

import { StablecoinRecord } from '@/lib/stablecoins-data'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function StablecoinKpis({ data }: { data: StablecoinRecord[] }) {
  const active = data.filter((coin) => coin.status === 'Active').length
  const pending = data.filter((coin) => coin.status !== 'Active').length
  const supply = data.reduce((acc, coin) => acc + coin.supply, 0)

  const cards = [
    {
      label: 'Active stablecoins',
      value: active,
      hint: 'Operational programs',
    },
    {
      label: 'Pending stablecoins',
      value: pending,
      hint: 'Awaiting review/compliance',
    },
    {
      label: 'Total issued supply',
      value: currency.format(supply),
      hint: 'Outstanding float in the last 24h',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-white/5 bg-[#111726] p-5">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
          <p className="mt-2 text-sm text-white/50">{card.hint}</p>
        </div>
      ))}
    </div>
  )
}

