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
import { StablecoinRecord, stablecoinsData } from '@/lib/stablecoins-data'

const statusStyles: Record<string, string> = {
  Active: 'text-emerald-300 bg-emerald-300/10 border-emerald-300/20',
  'Pending review': 'text-amber-300 bg-amber-300/10 border-amber-300/20',
  Maintenance: 'text-rose-300 bg-rose-300/10 border-rose-300/20',
}

export function StablecoinsPanel() {
  const [selectedToken, setSelectedToken] = useState(stablecoinsData[0].token)
  const selected = useMemo(
    () => stablecoinsData.find((coin) => coin.token === selectedToken) ?? stablecoinsData[0],
    [selectedToken],
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border border-white/5 bg-[#111726]">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">stablecoins</p>
            <h3 className="text-lg font-semibold text-white">Active programs</h3>
          </div>
          <span className="text-xs text-white/50">{stablecoinsData.length} records</span>
        </div>
        <Table className="text-white">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-white/60">Token</TableHead>
              <TableHead className="text-white/60">Supply</TableHead>
              <TableHead className="text-white/60">Status</TableHead>
              <TableHead className="text-white/60">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stablecoinsData.map((coin) => (
              <TableRow
                key={coin.token}
                className={`cursor-pointer border-white/5 transition-colors ${
                  selectedToken === coin.token ? 'bg-white/10' : 'hover:bg-white/5/50'
                }`}
                onClick={() => setSelectedToken(coin.token)}
              >
                <TableCell>
                  <div>
                    <p className="font-semibold">{coin.name}</p>
                    <p className="text-xs text-white/50">{coin.token}</p>
                  </div>
                </TableCell>
                <TableCell>{formatSupply(coin.supply)}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${statusStyles[coin.status] ?? 'text-white/70 border-white/15'} border`}
                  >
                    {coin.status}
                  </Badge>
                </TableCell>
                <TableCell>{coin.pendingRequests}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-2xl border border-white/5 bg-[#111726] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">details</p>
            <h3 className="text-xl font-semibold text-white">{selected.name}</h3>
            <p className="text-sm text-white/50">{selected.lastActivity}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[selected.status] ?? 'text-white/70 border-white/15'}`}
          >
            {selected.status}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <DetailStat label="Circulating supply" value={formatSupply(selected.supply)} />
          <DetailStat label="Available liquidity" value={selected.liquidityPool} />
          <DetailStat label="Pending requests" value={selected.pendingRequests} />
          <DetailStat label="Minted in the last 24h" value={selected.minted24h} />
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Recent transactions</h4>
            <button className="text-xs text-white/50 hover:text-white">Export CSV</button>
          </div>
          <Table className="mt-4 text-white">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-white/60">Transaction</TableHead>
                <TableHead className="text-white/60">Channel</TableHead>
                <TableHead className="text-white/60">Direction</TableHead>
                <TableHead className="text-white/60 text-right">Amount</TableHead>
                <TableHead className="text-white/60">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <p className="font-semibold">{tx.type}</p>
                    <p className="text-xs text-white/40">
                      {tx.id} • {tx.time}
                    </p>
                  </TableCell>
                  <TableCell>{tx.channel}</TableCell>
                  <TableCell>{tx.direction}</TableCell>
                  <TableCell className="text-right">{tx.amount}</TableCell>
                  <TableCell className="text-white/50">{tx.status}</TableCell>
                </TableRow>
              ))}
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

function formatSupply(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

