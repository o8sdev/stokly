import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getShoppingList } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { ShoppingListView } from '@/components/inventory/shopping-list-view'

// Build-to-par shopping list: every ingredient below its par level (or at/below
// its reorder threshold) with a suggested order quantity, grouped by supplier.
// "Create purchase" prefills the Alışlar delivery form.
export default async function ShoppingListPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const data = await getShoppingList(ctx.tenantId)

  return (
    <div>
      <PageHeader
        title={t('shopping.title')}
        description={t('shopping.subtitle')}
      />

      {data.item_count === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
          {t('shopping.empty')}
        </p>
      ) : (
        <ShoppingListView data={data} />
      )}
    </div>
  )
}
