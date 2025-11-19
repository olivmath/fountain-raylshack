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

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const statusStyles: Record<string, string> = {
  minted: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  withdraw_successful: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  payment_pending: 'text-amber-300 bg-amber-300/10 border-amber-300/20',
  payment_deposited: 'text-blue-300 bg-blue-300/10 border-blue-300/20',
  minting_in_progress: 'text-blue-300 bg-blue-300/10 border-blue-300/20',
  burn_initiated: 'text-orange-300 bg-orange-300/10 border-orange-300/20',
  tokens_burned: 'text-orange-300 bg-orange-300/10 border-orange-300/20',
  failed: 'text-rose-300 bg-rose-300/10 border-rose-300/20',
}

type OperationsTableProps = {
  data: DashboardApiResponse
}

export function OperationsTable({ data }: OperationsTableProps) {
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw'>('all')
  const [limit, setLimit] = useState(10)

  const filteredOperations = useMemo(() => {
    let ops = data.operations
    
    if (filter !== 'all') {
      ops = ops.filter((op) => op.operation_type === filter)
    }
    
    return ops.slice(0, limit)
  }, [data.operations, filter, limit])

  const stats = useMemo(() => {
    const deposits = data.operations.filter((op) => op.operation_type === 'deposit')
    const withdrawals = data.operations.filter((op) => op.operation_type === 'withdraw')
    
    return {
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      successfulDeposits: deposits.filter((op) => op.status === 'minted').length,
      successfulWithdrawals: withdrawals.filter((op) => op.status === 'withdraw_successful').length,
    }
  }, [data.operations])

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111726]">
      <div className="border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">operations</p>
            <h3 className="text-base sm:text-lg font-semibold text-white">All transactions</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'border-white text-white bg-white/10'
                  : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
              }`}
            >
              All ({data.operations.length})
            </button>
            <button
              onClick={() => setFilter('deposit')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'deposit'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
              }`}
            >
              Deposits ({stats.totalDeposits})
            </button>
            <button
              onClick={() => setFilter('withdraw')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                filter === 'withdraw'
                  ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                  : 'border-white/15 text-white/50 hover:text-white hover:border-white/40'
              }`}
            >
              Withdrawals ({stats.totalWithdrawals})
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Success Rate"
            value={`${((stats.successfulDeposits + stats.successfulWithdrawals) / (stats.totalDeposits + stats.totalWithdrawals) * 100).toFixed(1)}%`}
          />
          <StatCard label="Successful Deposits" value={stats.successfulDeposits.toString()} />
          <StatCard label="Successful Withdrawals" value={stats.successfulWithdrawals.toString()} />
          <StatCard
            label="Pending"
            value={(stats.totalDeposits + stats.totalWithdrawals - stats.successfulDeposits - stats.successfulWithdrawals).toString()}
          />
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[800px] px-4 sm:px-0">
        <Table className="text-white">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white/60">Operation ID</TableHead>
              <TableHead className="text-white/60">Stablecoin</TableHead>
              <TableHead className="text-white/60">Type</TableHead>
              <TableHead className="text-white/60 text-right">Amount</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Created</TableHead>
              <TableHead className="text-white/60">Tx Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperations.length > 0 ? (
              filteredOperations.map((op) => {
                const stablecoin = data.stablecoins.find((s) => s.stablecoin_id === op.stablecoin_id)
                
                return (
                  <TableRow key={op.operation_id} className="border-white/5">
                    <TableCell>
                      <span className="font-mono text-xs">{op.operation_id.substring(0, 8)}...</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">{stablecoin?.symbol || 'Unknown'}</p>
                        <p className="text-xs text-white/40">{stablecoin?.client_name || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          op.operation_type === 'deposit'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-orange-500/10 text-orange-400'
                        }`}
                      >
                        {op.operation_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{currency.format(Number(op.amount))}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${statusStyles[op.status] ?? 'text-white/70 border-white/15'} border text-xs`}
                      >
                        {op.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">
                      {new Date(op.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {op.tx_hash ? (
                        <a
                          href={`https://devnet-explorer.rayls.com/tx/${op.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          {op.tx_hash.substring(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-white/30 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-white/50 py-12">
                  No operations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {filteredOperations.length < data.operations.filter((op) => filter === 'all' || op.operation_type === filter).length && (
        <div className="border-t border-white/5 px-4 sm:px-6 py-4 flex justify-center">
          <button
            onClick={() => setLimit((prev) => prev + 10)}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Load more operations
          </button>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F141F] p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

