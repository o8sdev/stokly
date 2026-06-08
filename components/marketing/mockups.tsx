import { cn } from '@/lib/utils'
import { TrendingUp, Boxes, CalendarClock } from 'lucide-react'

/* Realistic dark Stokly UI mockups, presented on the light page as floating
   "product shots". Static by design — crisp, premium, no animation needed. */

function WindowChrome({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mk-window overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-2 font-mono text-[11px] text-slate-500">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function MetricTile({
  label,
  value,
  unit,
  tone = 'default',
}: {
  label: string
  value: string
  unit?: string
  tone?: 'default' | 'teal' | 'red'
}) {
  const valueColor =
    tone === 'teal'
      ? 'text-brand'
      : tone === 'red'
        ? 'text-[#F08C8C]'
        : 'text-white'
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className={cn('font-mono text-xl font-medium tabular-nums', valueColor)}>
          {value}
        </span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </p>
    </div>
  )
}

// Floating accent card used around the hero mockup.
function FloatCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'absolute rounded-2xl border border-white/10 bg-[#0E1C2D]/95 p-4 backdrop-blur-sm mk-shadow-float',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface DashboardLabels {
  title: string
  foodCost: string
  inventory: string
  waste: string
  trend: string
  expiring: string
  fifo: string
  days: string
}

// The dashboard window on its own (reused in a showcase section).
export function MockDashboard({ labels }: { labels: DashboardLabels }) {
  const bars = [38, 52, 44, 61, 49, 70, 58, 77, 64, 85, 72, 92]
  return (
    <WindowChrome title={labels.title} className="mk-shadow-deep">
      <div className="space-y-4 p-5">
        {/* Metric row */}
        <div className="grid grid-cols-3 gap-3">
          <MetricTile label={labels.foodCost} value="28,4" unit="%" tone="teal" />
          <MetricTile label={labels.inventory} value="12 480" unit="₼" />
          <MetricTile label={labels.waste} value="184" unit="₼" tone="red" />
        </div>

        {/* Chart + expiring */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-brand" />
              <span className="text-[11px] text-slate-400">{labels.trend}</span>
            </div>
            <div className="flex h-24 items-end gap-1.5">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-brand/20 to-brand/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5 text-[#D9A441]" />
              <span className="text-[11px] text-slate-400">
                {labels.expiring}
              </span>
            </div>
            <ExpiryRow name="Toyuq döşü" qty="3,2 kg" days={`2 ${labels.days}`} critical />
            <ExpiryRow name="Qaymaq" qty="1,1 L" days={`5 ${labels.days}`} />
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

// Hero centerpiece: the dashboard window with floating accent cards.
export function HeroMock({ labels }: { labels: DashboardLabels }) {
  return (
    <div className="relative">
      <div className="mk-bloom-teal absolute -inset-16 -z-10 blur-2xl" aria-hidden />

      <MockDashboard labels={labels} />

      {/* Floating cards */}
      <FloatCard className="-right-5 -top-8 hidden w-44 animate-mk-float md:block">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {labels.foodCost}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-2xl font-semibold text-brand">
            28,4%
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: '#ECFDF5', color: '#065F46' }}
          >
            Good
          </span>
        </div>
      </FloatCard>

      <FloatCard className="-bottom-7 -left-5 hidden items-center gap-3 md:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Boxes className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {labels.fifo}
          </p>
          <p className="font-mono text-sm font-medium text-white">
            batch · <span className="text-brand">4 {labels.days}</span>
          </p>
        </div>
      </FloatCard>
    </div>
  )
}

function ExpiryRow({
  name,
  qty,
  days,
  critical,
}: {
  name: string
  qty: string
  days: string
  critical?: boolean
}) {
  const badge = critical
    ? { bg: '#3a1a1c', text: '#F8A9A0' }
    : { bg: '#3a2f17', text: '#E7C66B' }
  return (
    <div className="flex items-center justify-between border-b border-white/[0.05] py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-white">{name}</p>
        <p className="font-mono text-[11px] text-slate-500">{qty}</p>
      </div>
      <span
        className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium"
        style={{ background: badge.bg, color: badge.text }}
      >
        {days}
      </span>
    </div>
  )
}

/* ── Recipe builder showcase ─────────────────────────────────────────────── */

export function MockRecipe({
  labels,
}: {
  labels: {
    title: string
    recipeName: string
    total: string
    perServing: string
    foodCost: string
    suggested: string
  }
}) {
  const lines = [
    { name: 'Toyuq döşü', qty: '0,200 kg', cost: '1,98' },
    { name: 'Soğan', qty: '0,050 kg', cost: '0,14' },
    { name: 'Çörək crumb', qty: '0,030 kg', cost: '0,11' },
    { name: 'Ədviyyat qarışığı', qty: '0,010 kg', cost: '0,22' },
  ]
  return (
    <WindowChrome title={labels.title} className="mk-shadow-deep">
      <div className="grid gap-px bg-white/[0.05] sm:grid-cols-[1.4fr_1fr]">
        {/* Lines */}
        <div className="bg-[#0c1828] p-5">
          <p className="font-display text-lg font-semibold text-white">
            {labels.recipeName}
          </p>
          <div className="mt-4 space-y-2">
            {lines.map((l) => (
              <div
                key={l.name}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div>
                  <p className="text-[13px] font-medium text-white">{l.name}</p>
                  <p className="font-mono text-[11px] text-slate-500">
                    {l.qty}
                  </p>
                </div>
                <span className="font-mono text-sm font-medium text-brand">
                  {l.cost} ₼
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Summary */}
        <div className="bg-[#0b1726] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {labels.foodCost}
          </p>
          <div className="mt-4 space-y-3">
            <SummaryRow label={labels.total} value="2,45 ₼" />
            <SummaryRow label={labels.perServing} value="1,23 ₼" />
            <div className="border-t border-white/[0.07] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {labels.foodCost}
                </span>
                <span
                  className="rounded-md px-2.5 py-1 font-mono text-xl font-semibold"
                  style={{ background: '#ECFDF5', color: '#065F46' }}
                >
                  26,7%
                </span>
              </div>
            </div>
            <SummaryRow label={labels.suggested} value="9,18 ₼" strong />
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={cn(
          'font-mono tabular-nums',
          strong ? 'text-lg font-semibold text-white' : 'text-sm text-white'
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Inventory + batches showcase ────────────────────────────────────────── */

export function MockInventory({
  labels,
}: {
  labels: {
    title: string
    name: string
    stock: string
    status: string
    batchReceived: string
    batchExpiry: string
  }
}) {
  return (
    <WindowChrome title={labels.title} className="mk-shadow-deep">
      <div className="p-5">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr] gap-2 border-b border-white/[0.07] pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>{labels.name}</span>
          <span className="text-right">{labels.stock}</span>
          <span className="text-right">{labels.status}</span>
        </div>
        <InvRow name="Toyuq döşü" stock="3,2 kg" status="low" expanded labels={labels} />
        <InvRow name="Pomidor" stock="14,0 kg" status="ok" />
        <InvRow name="Mozzarella" stock="0,0 kg" status="out" />
        <InvRow name="Zeytun yağı" stock="9,5 L" status="ok" />
      </div>
    </WindowChrome>
  )
}

function InvRow({
  name,
  stock,
  status,
  expanded,
  labels,
}: {
  name: string
  stock: string
  status: 'ok' | 'low' | 'out'
  expanded?: boolean
  labels?: { batchReceived: string; batchExpiry: string }
}) {
  const badge = {
    ok: { bg: '#10331f', text: '#74D69A', label: 'OK' },
    low: { bg: '#3a2f17', text: '#E7C66B', label: 'Low' },
    out: { bg: '#3a1a1c', text: '#F8A9A0', label: 'Out' },
  }[status]
  return (
    <>
      <div className="grid grid-cols-[1.6fr_1fr_0.8fr] items-center gap-2 border-b border-white/[0.05] py-3">
        <span className="text-[13px] font-medium text-white">{name}</span>
        <span className="text-right font-mono text-[13px] text-white">
          {stock}
        </span>
        <span className="flex justify-end">
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase"
            style={{ background: badge.bg, color: badge.text }}
          >
            {badge.label}
          </span>
        </span>
      </div>
      {expanded && labels && (
        <div className="mb-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-slate-500">
            <span>{labels.batchReceived}</span>
            <span className="text-right">qalıq</span>
            <span className="text-right">{labels.batchExpiry}</span>
          </div>
          <BatchRow received="03 İyun" qty="1,2 kg" expiry="09 İyun" />
          <BatchRow received="05 İyun" qty="2,0 kg" expiry="11 İyun" />
        </div>
      )}
    </>
  )
}

function BatchRow({
  received,
  qty,
  expiry,
}: {
  received: string
  qty: string
  expiry: string
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300">
      <span>{received}</span>
      <span className="text-right">{qty}</span>
      <span className="text-right">{expiry}</span>
    </div>
  )
}
