'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Info } from 'lucide-react'

const data = [
  { month: 'Jan', line1: 280, line2: 150, line3: 200, line4: 220 },
  { month: 'Feb', line1: 290, line2: 160, line3: 210, line4: 200 },
  { month: 'Mar', line1: 300, line2: 170, line3: 220, line4: 190 },
  { month: 'Apr', line1: 280, line2: 180, line3: 200, line4: 210 },
  { month: 'May', line1: 290, line2: 190, line3: 230, line4: 200 },
  { month: 'Jun', line1: 310, line2: 200, line3: 240, line4: 220 },
  { month: 'Jul', line1: 320, line2: 210, line3: 250, line4: 230 },
  { month: 'Aug', line1: 300, line2: 220, line3: 240, line4: 240 },
  { month: 'Sep', line1: 280, line2: 200, line3: 220, line4: 250 },
  { month: 'Oct', line1: 290, line2: 190, line3: 210, line4: 230 },
]

export function TransactionsChart() {
  return (
    <div className="bg-[#111726] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-semibold text-white">Number of transactions</h4>
        <button className="text-white/40 hover:text-white/70 transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)' }} />
          <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fill: 'rgba(255,255,255,0.7)' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Line type="monotone" dataKey="line1" stroke="#6372BF" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="line2" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="line3" stroke="#ec4899" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="line4" stroke="#2C1E49" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

