'use client'

import { useState } from 'react'
import { MetricCard } from './metric-card'
import { TransactionsChart } from './transactions-chart'

export function PlatformActivity() {
  const [timeRange, setTimeRange] = useState('Custom')

  const metrics = [
    { label: 'Revenue', value: '$1,650,570.00', change: '12.3%', changeType: 'up' as const },
    { label: 'On-ramp volume', value: '$21,650,570.00', change: '5%', changeType: 'up' as const },
    { label: 'Off-ramp volume', value: '$8,650,570.00', change: '1.2%', changeType: 'down' as const },
    { label: 'Transfer volume', value: '$4,650,570.00', change: '13.6%', changeType: 'up' as const },
  ]

  const timeRanges = ['Custom', 'Today', 'Yesterday', '7D', '30D', '3M', '6M', '12M']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">activity</p>
          <h3 className="text-xl font-semibold text-white mt-1">Platform metrics</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === range
                  ? 'border-white text-white'
                  : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>

      {/* Chart */}
      <TransactionsChart />
    </div>
  )
}

