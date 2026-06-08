'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePlatformAdmin } from '@/lib/auth/admin'

export interface LibraryResult {
  ok?: boolean
  error?: string
}

export async function addLibraryItem(
  locale: string,
  _prev: LibraryResult,
  formData: FormData
): Promise<LibraryResult> {
  await requirePlatformAdmin(locale)

  const name_az = String(formData.get('name_az') ?? '').trim()
  const name_ru = String(formData.get('name_ru') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const default_unit = String(formData.get('default_unit') ?? '').trim()
  const yieldDisplay = Number(formData.get('yield') ?? 100)

  if (!name_az || !category || !default_unit) return { error: 'validation' }

  const supabase = createClient()
  const { error } = await supabase.from('global_ingredient_library').insert({
    name_az,
    name_ru: name_ru || null,
    category,
    default_unit,
    default_yield_percent:
      Number.isFinite(yieldDisplay) && yieldDisplay > 0
        ? Math.min(1, yieldDisplay / 100)
        : 1,
  })
  if (error) return { error: 'generic' }

  revalidatePath(`/${locale}/admin/library`)
  return { ok: true }
}

export async function deleteLibraryItem(
  locale: string,
  id: string
): Promise<void> {
  await requirePlatformAdmin(locale)
  const supabase = createClient()
  await supabase.from('global_ingredient_library').delete().eq('id', id)
  revalidatePath(`/${locale}/admin/library`)
}
