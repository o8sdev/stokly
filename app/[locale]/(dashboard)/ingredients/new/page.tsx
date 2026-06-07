import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getSuppliers } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { IngredientForm } from '@/components/ingredients/ingredient-form'

export default async function NewIngredientPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const suppliers = await getSuppliers(ctx.tenantId)

  return (
    <div>
      <PageHeader title={t('ingredients.add')} />
      <IngredientForm locale={locale} suppliers={suppliers} />
    </div>
  )
}
