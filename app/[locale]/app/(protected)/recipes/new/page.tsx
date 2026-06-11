import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getRecipeBuilderData } from '@/lib/data/recipe-builder'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeForm } from '@/components/recipes/recipe-form'

export default async function NewRecipePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)
  const builder = await getRecipeBuilderData(ctx.tenantId)

  return (
    <div>
      <PageHeader title={t('recipes.add')} />
      <RecipeForm
        locale={locale}
        ingredientOptions={builder.ingredientOptions}
        subRecipeOptions={builder.subRecipeOptions}
        consumptionLocations={builder.consumptionLocations}
        defaultConsumptionId={builder.defaultConsumptionId}
        multiLocation={builder.multiLocation}
        categories={builder.categories}
      />
    </div>
  )
}
