'use client'

import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatCurrencyBRL } from '@/lib/dashboard-transforms'
import type { DashboardApiResponse } from '@/lib/dashboard-types'

export type TransactionsChartPoint = {
  label: string
  deposits: number
  withdrawals: number
  net: number
}

type TransactionsChartProps = {
  data: DashboardApiResponse
}

export function TransactionsChart({ data }: TransactionsChartProps) {
  // Process real data into chart format
  const chartData = useMemo(() => {
    // Group operations by date
    const grouped = data.operations.reduce((acc, op) => {
      const date = new Date(op.created_at).toLocaleDateString('pt-BR', { 
        month: 'short', 
        day: 'numeric' 
      })
      
      if (!acc[date]) {
        acc[date] = { deposits: 0, withdrawals: 0 }
      }
      
      const amount = Number(op.amount || 0)
      if (op.operation_type === 'deposit') {
        acc[date].deposits += amount
      } else {
        acc[date].withdrawals += amount
      }
      
      return acc
    }, {} as Record<string, { deposits: number; withdrawals: number }>)
    
    // Convert to chart format and sort by date
    return Object.entries(grouped)
      .map(([label, values]) => ({
        label,
        deposits: values.deposits,
        withdrawals: values.withdrawals,
        net: values.deposits - values.withdrawals,
      }))
      .slice(-30) // Last 30 data points
  }, [data.operations])

  const hasData = chartData.length > 0

  return (
    <div className="rounded-xl border border-white/5 bg-[#111726] p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">volume</p>
          <h4 className="mt-1 text-base sm:text-lg font-semibold text-white">Transaction Flow</h4>
        </div>
        <button className="text-white/40 transition-colors hover:text-white/70">
          <Info className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={250} className="sm:!h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)' }} />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              tick={{ fill: 'rgba(255,255,255,0.7)' }}
              tickFormatter={(value) => formatCurrencyBRL(value)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(3, 5, 15, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value, name) => [formatCurrencyBRL(value as number), name === 'net' ? 'Volume líquido' : name === 'deposits' ? 'Depósitos' : 'Saques']}
            />
            <Legend />
            <Line type="monotone" dataKey="deposits" stroke="#22d3ee" strokeWidth={2} dot={false} name="Depósitos" />
            <Line type="monotone" dataKey="withdrawals" stroke="#f97316" strokeWidth={2} dot={false} name="Saques" />
            <Line type="monotone" dataKey="net" stroke="#a855f7" strokeWidth={2} dot={false} name="Volume líquido" />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="rounded-lg border border-dashed border-white/10 bg-[#0F131C] p-8 sm:p-12 text-center text-white/50 text-sm sm:text-base">
          No operations recorded yet.
        </div>
      )}
    </div>
  )
}

