'use client'

import { TrendingUp, TrendingDown, Info } from 'lucide-react'

export function MetricCard({ label, value, change, changeType }: { label: string, value: string, change: string, changeType: 'up' | 'down' }) {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm text-white/70">{label}</h4>
        <Info className="w-4 h-4 text-white/30" />
      </div>
      <p className="text-2xl font-semibold text-white mb-3">{value}</p>
      <div className="flex items-center gap-2">
        {changeType === 'up' ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-400" />
        )}
        <span className={`text-sm font-medium ${changeType === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {change}
        </span>
        <span className="text-sm text-white/40">vs. last 6 months</span>
      </div>
    </div>
  )
}

