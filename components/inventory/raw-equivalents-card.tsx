import { getTranslations } from 'next-intl/server'
import { Layers } from 'lucide-react'
import type { RawEquivalentLine } from '@/lib/calculations/raw-equivalents'
import { MonoValue } from '@/components/ui/stokly-theme'
import { formatQuantity } from '@/lib/utils'

// Raw-equivalent stock: prepped goods exploded back into the raw ingredients
// they embed, so "5 kg raw chicken + 10 portions nuggets" reads as the full
// 10 kg of chicken that is really in the kitchen.
export async function RawEquivalentsCard({
  lines,
}: {
  lines: RawEquivalentLine[]
}) {
  const t = await getTranslations('inventory')
  if (lines.length === 0) return null

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Layers className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">{t('raw_equiv_title')}</h2>
          <p className="text-xs text-muted-foreground">{t('raw_equiv_help')}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2.5 font-semibold">
              {t('raw_col_ingredient')}
            </th>
            <th className="px-3 py-2.5 text-right font-semibold">
              {t('raw_col_direct')}
            </th>
            <th className="px-3 py-2.5 text-right font-semibold">
              {t('raw_col_preps')}
            </th>
            <th className="px-4 py-2.5 text-right font-semibold">
              {t('raw_col_total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.ingredient_id} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 align-top">
                <span className="font-medium">{l.name}</span>
                <div className="mt-0.5 space-y-0.5">
                  {l.breakdown.map((b) => (
                    <p
                      key={b.produced_id}
                      className="text-[11px] text-muted-foreground"
                    >
                      {b.produced_name}:{' '}
                      <span className="font-mono tabular-nums">
                        {formatQuantity(b.produced_stock)} {b.produced_unit} ×{' '}
                        {formatQuantity(b.raw_per_unit)} ={' '}
                        {formatQuantity(b.raw_qty)} {l.unit}
                      </span>
                    </p>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right align-top">
                <MonoValue value={formatQuantity(l.direct_qty)} unit={l.unit} />
              </td>
              <td className="px-3 py-2.5 text-right align-top">
                <MonoValue
                  value={formatQuantity(l.in_preps_qty)}
                  unit={l.unit}
                />
              </td>
              <td className="px-4 py-2.5 text-right align-top font-semibold">
                <MonoValue value={formatQuantity(l.total_qty)} unit={l.unit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
