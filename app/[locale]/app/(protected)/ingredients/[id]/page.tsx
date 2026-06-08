import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getIngredient, getSuppliers } from '@/lib/data/queries'
import { PageHeader } from '@/components/layout/page-header'
import { IngredientForm } from '@/components/ingredients/ingredient-form'

export default async function EditIngredientPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredient, suppliers] = await Promise.all([
    getIngredient(ctx.tenantId, id),
    getSuppliers(ctx.tenantId),
  ])

  if (!ingredient) notFound()

  return (
    <div>
      <PageHeader title={t('ingredients.edit')} />
      <IngredientForm
        locale={locale}
        suppliers={suppliers}
        ingredient={ingredient}
      />
    </div>
  )
}
