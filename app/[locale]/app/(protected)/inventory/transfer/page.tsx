import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getStorageLocations,
  getStockByLocation,
} from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { TransferForm } from '@/components/inventory/transfer-form'

export default async function TransferPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: {
    ingredient?: string
    from?: string
    to?: string
    qty?: string
  }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const [ingredients, locations, stock] = await Promise.all([
    getIngredients(ctx.tenantId),
    getStorageLocations(ctx.tenantId),
    getStockByLocation(ctx.tenantId),
  ])

  // Prefill from a "move stock first" deep link (e.g. the waste form's transfer
  // prompt). Only seed values that actually belong to this tenant.
  const validIng = ingredients.some((i) => i.id === searchParams.ingredient)
  const validFrom = locations.some((l) => l.id === searchParams.from)
  const validTo = locations.some((l) => l.id === searchParams.to)
  const qtyOk = /^\d+(\.\d+)?$/.test(searchParams.qty ?? '')
  const initial = {
    ingredientId: validIng ? (searchParams.ingredient as string) : '',
    fromId: validFrom ? (searchParams.from as string) : '',
    toId: validTo ? (searchParams.to as string) : '',
    quantity: qtyOk ? (searchParams.qty as string) : '',
  }

  return (
    <div>
      <PageHeader
        title={t('inventory.move_stock')}
        description={t('inventory.move_stock_hint')}
        action={
          <Button asChild variant="outline" className="gap-2">
            <Link href="/app/inventory">
              <ChevronLeft className="h-4 w-4" />
              {t('common.back')}
            </Link>
          </Button>
        }
      />
      <TransferForm
        locale={locale}
        ingredients={ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          unit: i.unit,
        }))}
        locations={locations.map((l) => ({
          id: l.id,
          name: l.name,
          is_frozen: l.is_frozen,
        }))}
        stock={stock}
        initial={initial}
      />
    </div>
  )
}
