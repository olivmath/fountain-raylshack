'use client'

import { useState, useMemo } from 'react'
import { MetricCard } from './metric-card'
import { TransactionsChart } from './transactions-chart'
import type { DashboardApiResponse } from '@/lib/dashboard-types'

type PlatformActivityProps = {
  data: DashboardApiResponse
}

export function PlatformActivity({ data }: PlatformActivityProps) {
  const [timeRange, setTimeRange] = useState('Custom')

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const totalDeposits = data.operations
      .filter((op) => op.operation_type === 'deposit')
      .reduce((sum, op) => sum + Number(op.amount || 0), 0)
    
    const totalWithdrawals = data.operations
      .filter((op) => op.operation_type === 'withdraw')
      .reduce((sum, op) => sum + Number(op.amount || 0), 0)
    
    const successfulDeposits = data.operations
      .filter((op) => op.operation_type === 'deposit' && op.status === 'minted')
      .length
    
    const successfulWithdrawals = data.operations
      .filter((op) => op.operation_type === 'withdraw' && op.status === 'withdraw_successful')
      .length

    const totalOperations = data.operations.length
    const successRate = totalOperations > 0 
      ? ((successfulDeposits + successfulWithdrawals) / totalOperations * 100).toFixed(1)
      : '0'

    return [
      { 
        label: 'Total Volume', 
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDeposits + totalWithdrawals),
        change: `${successRate}%`, 
        changeType: 'up' as const 
      },
      { 
        label: 'Deposit Volume', 
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDeposits),
        change: `${successfulDeposits} ops`, 
        changeType: 'up' as const 
      },
      { 
        label: 'Withdraw Volume', 
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWithdrawals),
        change: `${successfulWithdrawals} ops`, 
        changeType: totalWithdrawals > 0 ? 'down' as const : 'up' as const 
      },
      { 
        label: 'Active Stablecoins', 
        value: data.stablecoins.length.toString(),
        change: `${data.stablecoins.filter(s => s.status === 'deployed').length} deployed`, 
        changeType: 'up' as const 
      },
    ]
  }, [data])

  const timeRanges = ['Custom', 'Today', 'Yesterday', '7D', '30D', '3M', '6M', '12M']

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">activity</p>
          <h3 className="text-lg sm:text-xl font-semibold text-white mt-1">Platform metrics</h3>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 sm:pb-0">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} {...metric} />
        ))}
      </div>

      {/* Chart */}
      <TransactionsChart data={data} />
    </div>
  )
}

