'use client'

import * as React from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Tags, X } from 'lucide-react'
import type { RecipeCategory } from '@/types/database'
import {
  createRecipeCategory,
  deleteRecipeCategory,
  type RecipeActionResult,
} from '@/app/[locale]/app/(protected)/recipes/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

// Manage the tenant's menu sections (breakfast, soups, …). Deleting a section
// never deletes recipes — they just become uncategorised (FK SET NULL).
export function CategoriesManager({
  locale,
  categories,
}: {
  locale: string
  categories: RecipeCategory[]
}) {
  const t = useTranslations('recipes')
  const [open, setOpen] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const [state, action] = useFormState<RecipeActionResult, FormData>(
    createRecipeCategory.bind(null, locale),
    {}
  )
  const [, start] = React.useTransition()

  React.useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Tags className="h-4 w-4" />
        {t('categories')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('categories')}</DialogTitle>
            <DialogDescription>{t('categories_help')}</DialogDescription>
          </DialogHeader>

          {categories.length > 0 && (
            <ul className="space-y-1.5">
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      start(() => deleteRecipeCategory(locale, c.id))
                    }
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={t('category_delete')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form ref={formRef} action={action} className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                name="name"
                required
                maxLength={100}
                placeholder={t('category_name_ph')}
              />
            </div>
            <SubmitButton className="h-[38px]">
              {t('add_category')}
            </SubmitButton>
          </form>
          {state.error && (
            <p className="text-sm text-destructive">{t('category_error')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
