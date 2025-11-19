'use client'

import { useMemo } from 'react'
import { ArrowDown, ArrowUp, TrendingUp } from 'lucide-react'
import type { DashboardApiResponse } from '@/lib/dashboard-types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

type ClientAnalyticsProps = {
  data: DashboardApiResponse
}

export function ClientAnalytics({ data }: ClientAnalyticsProps) {
  const analytics = useMemo(() => {
    // Calculate per-client metrics
    const clientMetrics = data.stablecoins.reduce((acc, coin) => {
      const stats = data.statsByStablecoin[coin.stablecoin_id]
      if (!stats) return acc

      if (!acc[coin.client_id]) {
        acc[coin.client_id] = {
          clientName: coin.client_name,
          stablecoins: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          netVolume: 0,
          operations: 0,
          successRate: 0,
        }
      }

      const metric = acc[coin.client_id]
      metric.stablecoins += 1
      metric.totalDeposits += stats.stats.deposits.total_amount
      metric.totalWithdrawals += stats.stats.withdrawals.total_amount
      metric.netVolume += stats.stats.volume.net_volume
      metric.operations += stats.stats.deposits.total_count + stats.stats.withdrawals.total_count

      const successful = stats.stats.deposits.successful_count + stats.stats.withdrawals.successful_count
      const total = stats.stats.deposits.total_count + stats.stats.withdrawals.total_count
      metric.successRate = total > 0 ? (successful / total) * 100 : 0

      return acc
    }, {} as Record<string, any>)

    return Object.values(clientMetrics).sort((a: any, b: any) => b.netVolume - a.netVolume)
  }, [data])

  const globalMetrics = useMemo(() => {
    const totalVolume = analytics.reduce((sum: number, c: any) => sum + c.netVolume, 0)
    const avgSuccessRate = analytics.length > 0 
      ? analytics.reduce((sum: number, c: any) => sum + c.successRate, 0) / analytics.length
      : 0
    const totalOps = analytics.reduce((sum: number, c: any) => sum + c.operations, 0)

    return { totalVolume, avgSuccessRate, totalOps }
  }, [analytics])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Platform Volume"
          value={currency.format(globalMetrics.totalVolume)}
          subtext={`Across ${data.stablecoins.length} stablecoins`}
        />
        <MetricCard
          icon={<ArrowUp className="h-5 w-5" />}
          label="Average Success Rate"
          value={`${globalMetrics.avgSuccessRate.toFixed(1)}%`}
          subtext="All clients combined"
        />
        <MetricCard
          icon={<ArrowDown className="h-5 w-5" />}
          label="Total Operations"
          value={globalMetrics.totalOps.toString()}
          subtext={`${data.operations.filter(op => op.operation_type === 'deposit').length} deposits / ${data.operations.filter(op => op.operation_type === 'withdraw').length} withdrawals`}
        />
      </div>

      {/* Per-Client Performance */}
      <div className="rounded-2xl border border-white/5 bg-[#111726]">
        <div className="border-b border-white/5 px-4 sm:px-6 py-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">clients</p>
          <h3 className="text-base sm:text-lg font-semibold text-white">Performance by client</h3>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {analytics.length > 0 ? (
            analytics.map((client: any, idx: number) => (
              <div
                key={client.clientName}
                className="rounded-xl border border-white/5 bg-[#0F141F] p-4 sm:p-5 hover:border-white/10 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm font-semibold text-white/40">#{idx + 1}</span>
                      <h4 className="text-base sm:text-lg font-semibold text-white truncate">{client.clientName}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-white/50 mt-1">
                      {client.stablecoins} stablecoin{client.stablecoins !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-white/40">Success Rate</p>
                    <p className="text-lg sm:text-xl font-bold text-emerald-400">{client.successRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-white/40">Net Volume</p>
                    <p className="text-sm font-semibold text-white mt-1">{currency.format(client.netVolume)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Total Deposits</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-1">
                      {currency.format(client.totalDeposits)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Total Withdrawals</p>
                    <p className="text-sm font-semibold text-orange-400 mt-1">
                      {currency.format(client.totalWithdrawals)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Operations</p>
                    <p className="text-sm font-semibold text-white mt-1">{client.operations}</p>
                  </div>
                </div>

                {/* Progress bar for volume */}
                <div className="mt-4">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                      style={{
                        width: `${(client.netVolume / globalMetrics.totalVolume) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {((client.netVolume / globalMetrics.totalVolume) * 100).toFixed(1)}% of total platform volume
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-white/50 py-12">No client data available</div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#111726] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-white/60">{icon}</div>
        <p className="text-xs uppercase tracking-[0.35em] text-white/40">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/50">{subtext}</p>
    </div>
  )
}

