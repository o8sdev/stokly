import { NextResponse } from 'next/server'
import { isPlatformAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { logAdminAction } from '@/lib/admin/audit'

// GET /api/admin/tenants/[id]/export — download all of a tenant's Phase-1 data
// as a JSON bundle (backup / handover). Admin-gated; returns 403 otherwise.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isPlatformAdmin())) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  const id = params.id
  const supabase = createClient()

  const [tenant, ingredients, recipes, recipeIngredients, movements, batches, payments, notes] =
    await Promise.all([
      supabase.from('tenants').select('*').eq('id', id).maybeSingle(),
      supabase.from('ingredients').select('*').eq('tenant_id', id),
      supabase.from('recipes').select('*').eq('tenant_id', id),
      supabase
        .from('recipe_ingredients')
        .select('*, recipes!inner(tenant_id)')
        .eq('recipes.tenant_id', id),
      supabase.from('stock_movements').select('*').eq('tenant_id', id),
      supabase.from('ingredient_batches').select('*').eq('tenant_id', id),
      supabase.from('manual_payments').select('*').eq('tenant_id', id),
      supabase.from('admin_notes').select('*').eq('tenant_id', id),
    ])

  if (!tenant.data) return new NextResponse('Not found', { status: 404 })

  await logAdminAction('tenant_exported', { targetTenantId: id })

  const bundle = {
    exported_at: new Date().toISOString(),
    tenant: tenant.data,
    ingredients: ingredients.data ?? [],
    recipes: recipes.data ?? [],
    recipe_ingredients: recipeIngredients.data ?? [],
    stock_movements: movements.data ?? [],
    ingredient_batches: batches.data ?? [],
    manual_payments: payments.data ?? [],
    admin_notes: notes.data ?? [],
  }

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="stokly-${tenant.data.slug}.json"`,
    },
  })
}
