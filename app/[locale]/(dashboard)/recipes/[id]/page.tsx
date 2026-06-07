import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireTenant } from '@/lib/auth/tenant'
import { getRecipe, getRecipeLines } from '@/lib/data/queries'
import { getRecipeBuilderData } from '@/lib/data/recipe-builder'
import { PageHeader } from '@/components/layout/page-header'
import { RecipeForm } from '@/components/recipes/recipe-form'

export default async function EditRecipePage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [recipe, lines, builderData] = await Promise.all([
    getRecipe(ctx.tenantId, id),
    getRecipeLines(id),
    getRecipeBuilderData(ctx.tenantId, id),
  ])

  if (!recipe) notFound()

  return (
    <div>
      <PageHeader title={t('recipes.edit')} />
      <RecipeForm
        locale={locale}
        ingredientOptions={builderData.ingredientOptions}
        subRecipeOptions={builderData.subRecipeOptions}
        recipe={recipe}
        existingLines={lines}
      />
    </div>
  )
}
