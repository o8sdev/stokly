'use client'

import { useRef, useEffect } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Trash2 } from 'lucide-react'
import type { Supplier } from '@/types/database'
import {
  createSupplier,
  deleteSupplier,
  type SettingsResult,
} from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function SuppliersManager({
  locale,
  suppliers,
}: {
  locale: string
  suppliers: Supplier[]
}) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const action = createSupplier.bind(null, locale)
  const [state, formAction] = useFormState<SettingsResult, FormData>(
    action,
    {}
  )

  // Reset the add form after a successful insert.
  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  const removeSupplier = deleteSupplier.bind(null, locale)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="stokly-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.supplier_name')}</TableHead>
              <TableHead>{t('settings.supplier_phone')}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  {t('settings.no_suppliers')}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone ?? '—'}</TableCell>
                  <TableCell>
                    <form action={removeSupplier.bind(null, s.id)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="submit"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="space-y-4 stokly-card p-5"
      >
        <h2 className="font-semibold">{t('settings.add_supplier')}</h2>
        <div className="space-y-2">
          <Label htmlFor="name">{t('settings.supplier_name')}</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t('settings.supplier_phone')}</Label>
          <Input id="phone" name="phone" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">{t('settings.supplier_notes')}</Label>
          <Textarea id="notes" name="notes" />
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        )}
        <SubmitButton pendingText={t('common.saving')} className="w-full">
          {t('common.add')}
        </SubmitButton>
      </form>
    </div>
  )
}
