'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'
import type { MrrPoint } from '@/lib/admin/metrics'

function MrrTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#0F2233] px-3 py-2 text-xs shadow-xl">
      <p className="mb-0.5 text-slate-400">{label}</p>
      <p className="font-mono font-semibold text-white">
        {Number(payload[0].value).toFixed(0)} AZN
      </p>
    </div>
  )
}

export function MrrChart({ data }: { data: MrrPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tickFormatter={(m: string) => m.slice(5)}
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<MrrTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
        <Line
          type="monotone"
          dataKey="mrr"
          stroke="#00C896"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#00C896' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
