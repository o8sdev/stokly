'use client'

import { useRef, useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Archive, ArchiveRestore, Pencil } from 'lucide-react'
import type { Supplier } from '@/types/database'
import {
  createSupplier,
  updateSupplier,
  archiveSupplier,
  restoreSupplier,
  type SettingsResult,
} from '../actions'
import { ArchiveToggle } from '@/components/ui/archive-toggle'
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
  archived,
}: {
  locale: string
  suppliers: Supplier[]
  archived: Supplier[]
}) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  // The side panel doubles as add (editing == null) and edit form.
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const [createState, createAction] = useFormState<SettingsResult, FormData>(
    createSupplier.bind(null, locale),
    {}
  )
  const [updateState, updateAction] = useFormState<SettingsResult, FormData>(
    updateSupplier.bind(null, locale),
    {}
  )
  const state = editing ? updateState : createState

  // Reset after a successful insert; leave edit mode after a successful update.
  useEffect(() => {
    if (createState.success) formRef.current?.reset()
  }, [createState.success])
  useEffect(() => {
    if (updateState.success) setEditing(null)
  }, [updateState.success])

  const archive = archiveSupplier.bind(null, locale)
  const restore = restoreSupplier.bind(null, locale)
  const list = showArchived ? archived : suppliers

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <ArchiveToggle
          showArchived={showArchived}
          onChange={setShowArchived}
          activeCount={suppliers.length}
          archivedCount={archived.length}
        />
        <div className="stokly-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.supplier_name')}</TableHead>
                <TableHead>{t('settings.supplier_phone')}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    {showArchived
                      ? t('common.no_archived')
                      : t('settings.no_suppliers')}
                  </TableCell>
                </TableRow>
              ) : (
                list.map((s) => (
                  <TableRow
                    key={s.id}
                    className={showArchived ? 'opacity-60' : undefined}
                  >
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.phone ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {showArchived ? (
                          <form action={restore.bind(null, s.id)}>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="submit"
                              aria-label={t('common.restore')}
                            >
                              <ArchiveRestore className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </form>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              aria-label={t('settings.edit_supplier')}
                              onClick={() => setEditing(s)}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <form action={archive.bind(null, s.id)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="submit"
                                aria-label={t('common.archive')}
                              >
                                <Archive className="h-4 w-4 text-destructive" />
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* key remounts the form when switching add <-> edit so defaults apply */}
      <form
        key={editing?.id ?? 'new'}
        ref={formRef}
        action={editing ? updateAction : createAction}
        className="space-y-4 stokly-card p-5"
      >
        <h2 className="font-semibold">
          {editing ? t('settings.edit_supplier') : t('settings.add_supplier')}
        </h2>
        {editing && (
          <input type="hidden" name="supplier_id" value={editing.id} />
        )}
        <div className="space-y-2">
          <Label htmlFor="name">{t('settings.supplier_name')}</Label>
          <Input id="name" name="name" required defaultValue={editing?.name ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t('settings.supplier_phone')}</Label>
          <Input id="phone" name="phone" defaultValue={editing?.phone ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">{t('settings.supplier_notes')}</Label>
          <Textarea id="notes" name="notes" defaultValue={editing?.notes ?? ''} />
        </div>
        {state.error && (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        )}
        <div className="flex gap-2">
          <SubmitButton pendingText={t('common.saving')} className="flex-1">
            {editing ? t('common.save') : t('common.add')}
          </SubmitButton>
          {editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
