import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { requireTenant } from '@/lib/auth/tenant'
import {
  getIngredients,
  getRecipes,
  getArchivedRecipes,
  getRecipeIngredients,
  getRecipeCategories,
} from '@/lib/data/queries'
import { computeRecipesWithCost } from '@/lib/calculations/recipe-cost'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { RecipeListTable } from '@/components/recipes/recipe-list-table'
import { CategoriesManager } from '@/components/recipes/categories-manager'

export default async function RecipesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations()
  const ctx = await requireTenant(locale)

  const [ingredients, recipes, archivedRecipes, recipeIngredients, categories] =
    await Promise.all([
      getIngredients(ctx.tenantId),
      getRecipes(ctx.tenantId),
      getArchivedRecipes(ctx.tenantId),
      getRecipeIngredients(ctx.tenantId),
      getRecipeCategories(ctx.tenantId),
    ])

  const rows = computeRecipesWithCost(ingredients, recipes, recipeIngredients)
  const archivedRows = computeRecipesWithCost(
    ingredients,
    archivedRecipes,
    recipeIngredients
  )

  return (
    <div>
      <PageHeader
        title={t('recipes.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <CategoriesManager locale={locale} categories={categories} />
            <Button asChild className="gap-2">
              <Link href="/app/recipes/new">
                <Plus className="h-4 w-4" />
                {t('recipes.add')}
              </Link>
            </Button>
          </div>
        }
      />
      <RecipeListTable
        locale={locale}
        rows={rows}
        archived={archivedRows}
        categories={categories}
      />
    </div>
  )
}
