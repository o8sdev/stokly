import { CountUp } from './count-up'

// Decorative "instrument panel" — a stylised mini-dashboard for the hero.
// Pure presentation; numbers are illustrative and animate on load via CountUp.
export function HeroPanel({
  labels,
}: {
  labels: {
    live: string
    foodCost: string
    inventory: string
    waste: string
    margin: string
  }
}) {
  // Ring geometry for the food-cost gauge (~28.4%).
  const r = 52
  const c = 2 * Math.PI * r
  const pct = 0.284
  const dash = c * pct

  return (
    <div className="relative">
      {/* Glow behind the panel */}
      <div className="mk-glow absolute -inset-10 -z-10" aria-hidden />

      <div className="animate-mk-float rounded-2xl border border-white/10 bg-gradient-to-b from-[#122438] to-[#0E1C2D] p-5 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
            stokly · idarə paneli
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
            <span className="h-1.5 w-1.5 animate-mk-pulse rounded-full bg-brand" />
            {labels.live}
          </span>
        </div>

        {/* Gauge + mini stats */}
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke="#00C896"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CountUp
                to={28.4}
                decimals={1}
                suffix="%"
                className="font-mono text-2xl font-semibold text-white"
              />
              <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {labels.foodCost}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            <StatRow
              label={labels.inventory}
              value={<CountUp to={12480} suffix=" ₼" className="font-mono text-sm font-medium text-white" />}
            />
            <StatRow
              label={labels.waste}
              value={<CountUp to={184} prefix="−" suffix=" ₼" className="font-mono text-sm font-medium text-[#F08C8C]" />}
            />
            <StatRow
              label={labels.margin}
              value={<CountUp to={67} suffix="%" className="font-mono text-sm font-medium text-brand" />}
            />
          </div>
        </div>

        {/* Sparkline-ish ticker */}
        <div className="mt-5 flex items-end gap-1">
          {[34, 52, 41, 63, 48, 72, 58, 80, 66, 88, 74, 95].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-brand/20 to-brand/70"
              style={{ height: `${h * 0.4}px` }}
            />
          ))}
        </div>
      </div>

      {/* Floating mini-card */}
      <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-white/10 bg-[#0E1C2D] px-4 py-3 shadow-xl shadow-black/40 sm:block">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">FIFO</p>
        <p className="font-mono text-sm font-medium text-white">
          batch · <span className="text-brand">4 gün</span>
        </p>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      {value}
    </div>
  )
}
