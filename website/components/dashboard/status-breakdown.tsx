'use client'

import { useMemo } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardApiResponse } from '@/lib/dashboard-types'

const STATUS_COLORS: Record<string, string> = {
  minted: '#10b981',
  withdraw_successful: '#10b981',
  payment_pending: '#f59e0b',
  payment_deposited: '#3b82f6',
  minting_in_progress: '#3b82f6',
  burn_initiated: '#f97316',
  tokens_burned: '#f97316',
  client_notified: '#8b5cf6',
  failed: '#ef4444',
}

type StatusBreakdownProps = {
  data: DashboardApiResponse
}

export function StatusBreakdown({ data }: StatusBreakdownProps) {
  const chartData = useMemo(() => {
    const statusCounts = data.operations.reduce((acc, op) => {
      acc[op.status] = (acc[op.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status.replace(/_/g, ' '),
        value: count,
        fill: STATUS_COLORS[status] || '#6b7280',
      }))
      .sort((a, b) => b.value - a.value)
  }, [data.operations])

  const totalOps = data.operations.length

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111726] p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">status</p>
        <h4 className="mt-1 text-base sm:text-lg font-semibold text-white">Operations breakdown</h4>
        <p className="mt-1 text-xs sm:text-sm text-white/50">{totalOps} total operations</p>
      </div>

      {chartData.length > 0 ? (
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px] lg:w-1/2">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                className="sm:!outerRadius-[100px]"
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(3, 5, 15, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 w-full space-y-2 sm:space-y-3">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                  <span className="text-xs sm:text-sm text-white/80 capitalize truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <span className="text-xs sm:text-sm font-semibold text-white">{item.value}</span>
                  <span className="text-xs text-white/50 w-10 sm:w-12 text-right">
                    {((item.value / totalOps) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-[#0F131C] p-8 sm:p-12 text-center text-white/50 text-sm sm:text-base">
          No operations to display
        </div>
      )}
    </div>
  )
}

