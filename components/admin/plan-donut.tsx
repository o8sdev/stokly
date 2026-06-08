'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  type TooltipProps,
} from 'recharts'
import { planColor } from '@/lib/admin/plan-utils'
import type { PlanSlice } from '@/lib/admin/metrics'

export function PlanDonut({
  data,
  labels,
  emptyLabel,
}: {
  data: PlanSlice[]
  labels: Record<string, string>
  emptyLabel: string
}) {
  const slices = data.filter((d) => d.count > 0)
  const total = slices.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    )
  }

  function DonutTooltip({ active, payload }: TooltipProps<number, string>) {
    if (!active || !payload || payload.length === 0) return null
    const slice = payload[0].payload as PlanSlice
    const pct = Math.round((slice.count / total) * 100)
    return (
      <div className="rounded-lg border border-white/10 bg-[#0F2233] px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-white">{labels[slice.plan] ?? slice.plan}</p>
        <p className="text-slate-400">
          {slice.count} · {pct}%
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[240px] w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="plan"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((s) => (
                <Cell key={s.plan} fill={planColor(s.plan)} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 sm:w-1/2">
        {slices.map((s) => {
          const pct = Math.round((s.count / total) * 100)
          return (
            <li key={s.plan} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: planColor(s.plan) }}
              />
              <span className="flex-1 text-slate-300">{labels[s.plan] ?? s.plan}</span>
              <span className="font-mono text-white">{s.count}</span>
              <span className="w-10 text-right font-mono text-xs text-slate-500">
                {pct}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
