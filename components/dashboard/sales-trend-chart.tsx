'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  type TooltipProps,
} from 'recharts'

// Daily sales bar chart for the owner's overview. The best day is highlighted
// in a deeper teal and the dashed line marks the period average — so a glance
// answers "how does today compare".
function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-0.5 text-muted-foreground">{label}</p>
      <p className="font-mono font-semibold text-foreground">
        {fmt(Number(payload[0].value))} AZN
      </p>
    </div>
  )
}

export function SalesTrendChart({
  data,
}: {
  data: { date: string; amount: number }[]
}) {
  // Show MM-DD so windows that cross a month boundary stay readable.
  const rows = data.map((d) => ({ label: d.date.slice(5), amount: d.amount }))
  const nonZero = rows.filter((r) => r.amount > 0)
  const avg =
    nonZero.length > 0
      ? nonZero.reduce((s, r) => s + r.amount, 0) / nonZero.length
      : 0
  const max = Math.max(0, ...rows.map((r) => r.amount))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(100,116,139,0.15)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
          }
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: 'rgba(100,116,139,0.08)' }}
        />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="#64748b"
            strokeDasharray="4 4"
            strokeOpacity={0.6}
          />
        )}
        <Bar
          dataKey="amount"
          fill="hsl(165 100% 39%)"
          radius={[3, 3, 0, 0]}
          maxBarSize={36}
          animationDuration={700}
        >
          {rows.map((r, i) => (
            <Cell
              key={i}
              fill={
                r.amount === max && max > 0
                  ? 'hsl(165 100% 27%)'
                  : 'hsl(165 100% 39%)'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
