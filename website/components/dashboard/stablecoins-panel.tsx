'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DashboardApiResponse } from '@/lib/dashboard-types'

const statusStyles: Record<string, string> = {
  deployed: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  registered: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
  maintenance: 'text-rose-300 bg-rose-300/10 border-rose-300/20',
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

type StablecoinsPanelProps = {
  data: DashboardApiResponse
}

export function StablecoinsPanel({ data }: StablecoinsPanelProps) {
  const [selectedId, setSelectedId] = useState(data.stablecoins[0]?.stablecoin_id)
  
  const selected = useMemo(
    () => data.stablecoins.find((coin) => coin.stablecoin_id === selectedId) ?? data.stablecoins[0],
    [selectedId, data.stablecoins],
  )

  const selectedStats = selected ? data.statsByStablecoin[selected.stablecoin_id] : null

  const recentOperations = useMemo(() => {
    if (!selected) return []
    return data.operations
      .filter((op) => op.stablecoin_id === selected.stablecoin_id)
      .slice(0, 5)
  }, [selected, data.operations])

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-white/5 bg-[#111726]">
        <div className="flex items-center justify-between border-b border-white/5 px-4 sm:px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">stablecoins</p>
            <h3 className="text-base sm:text-lg font-semibold text-white">Active programs</h3>
          </div>
          <span className="text-xs text-white/50 whitespace-nowrap">{data.stablecoins.length} records</span>
        </div>
        <Table className="text-white">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white/60">Token</TableHead>
              <TableHead className="text-white/60">Net Volume</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Operations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.stablecoins.map((coin) => {
              const stats = data.statsByStablecoin[coin.stablecoin_id]
              const netVolume = stats?.stats.volume.net_volume || 0
              const totalOps = (stats?.stats.deposits.total_count || 0) + (stats?.stats.withdrawals.total_count || 0)
              
              return (
                <TableRow
                  key={coin.stablecoin_id}
                  className={`cursor-pointer border-white/5 transition-colors ${
                    selectedId === coin.stablecoin_id ? 'bg-white/10' : 'hover:bg-white/5/50'
                  }`}
                  onClick={() => setSelectedId(coin.stablecoin_id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold">{coin.client_name}</p>
                      <p className="text-xs text-white/50">{coin.symbol}</p>
                    </div>
                  </TableCell>
                  <TableCell>{currency.format(netVolume)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${statusStyles[coin.status] ?? 'text-white/70 border-white/15'} border`}
                    >
                      {coin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{totalOps}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#111726] p-4 sm:p-6">
        {selected && selectedStats ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">details</p>
                <h3 className="text-xl font-semibold text-white">{selected.client_name}</h3>
                <p className="text-sm text-white/50">
                  {selected.deployed_at 
                    ? new Date(selected.deployed_at).toLocaleDateString('pt-BR')
                    : 'Not deployed yet'}
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[selected.status] ?? 'text-white/70 border-white/15'}`}
              >
                {selected.status}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <DetailStat 
                label="Total Deposits" 
                value={currency.format(selectedStats.stats.deposits.total_amount)} 
              />
              <DetailStat 
                label="Total Withdrawals" 
                value={currency.format(selectedStats.stats.withdrawals.total_amount)} 
              />
              <DetailStat 
                label="Successful Deposits" 
                value={selectedStats.stats.deposits.successful_count.toString()} 
              />
              <DetailStat 
                label="Successful Withdrawals" 
                value={selectedStats.stats.withdrawals.successful_count.toString()} 
              />
            </div>
          </>
        ) : (
          <div className="text-white/50 text-center py-12">No stablecoin selected</div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Recent operations</h4>
            <button className="text-xs text-white/50 hover:text-white">View all</button>
          </div>
          <Table className="mt-4 text-white">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-white/60">Operation</TableHead>
                <TableHead className="text-white/60">Type</TableHead>
                <TableHead className="text-white/60 text-right">Amount</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOperations.length > 0 ? (
                recentOperations.map((op) => (
                  <TableRow key={op.operation_id}>
                    <TableCell>
                      <p className="font-semibold text-xs">{op.operation_id.substring(0, 8)}...</p>
                      <p className="text-xs text-white/40">
                        {new Date(op.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${op.operation_type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {op.operation_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{currency.format(Number(op.amount))}</TableCell>
                    <TableCell className="text-white/50 text-xs">{op.status}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-white/50 py-8">
                    No operations yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0F141F] p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

