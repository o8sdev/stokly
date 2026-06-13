'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import * as XLSX from 'xlsx'
import { Download, UploadCloud, FileSpreadsheet, ClipboardPaste } from 'lucide-react'
import {
  rowsFromMatrix,
  rowsFromPaste,
  type DraftRow,
} from '@/lib/import/parse-ingredients'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ImportPreview } from './import-preview'

type Tab = 'excel' | 'paste'
const MAX_BYTES = 5 * 1024 * 1024

export function ImportClient({ locale }: { locale: string }) {
  const t = useTranslations('import')
  const [tab, setTab] = useState<Tab>('excel')
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null)
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError(t('upload_hint'))
      return
    }
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const matrix = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        blankrows: false,
      }) as unknown[][]
      setDrafts(rowsFromMatrix(matrix))
    } catch {
      setError(t('empty'))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function parsePaste() {
    const rows = rowsFromPaste(paste)
    if (rows.length === 0) {
      setError(t('empty'))
      return
    }
    setError(null)
    setDrafts(rows)
  }

  if (drafts) {
    return (
      <ImportPreview
        locale={locale}
        initialRows={drafts}
        onBack={() => setDrafts(null)}
      />
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof FileSpreadsheet }[] = [
    { id: 'excel', label: t('tab_excel'), icon: FileSpreadsheet },
    { id: 'paste', label: t('tab_paste'), icon: ClipboardPaste },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
        {tabs.map((tb) => {
          const Icon = tb.icon
          return (
            <button
              key={tb.id}
              onClick={() => {
                setTab(tb.id)
                setError(null)
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === tb.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {tb.label}
            </button>
          )
        })}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-6">
        {tab === 'excel' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="stokly-card p-6">
              <h3 className="font-semibold">{t('step_download')}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t('step_download_desc')}
              </p>
              <Button asChild variant="outline" className="mt-4 gap-2">
                <a href="/api/templates/ingredients" download>
                  <Download className="h-4 w-4" />
                  {t('download_template')}
                </a>
              </Button>
            </div>
            <div className="stokly-card p-6">
              <h3 className="font-semibold">{t('step_upload')}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t('upload_hint')}
              </p>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary/50">
                <UploadCloud className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium text-primary">
                  {busy ? t('parsing') : t('choose_file')}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'paste' && (
          <div className="stokly-card p-6">
            <label className="text-sm font-medium">{t('paste_label')}</label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={9}
              placeholder={t('paste_placeholder')}
              className="mt-2 w-full rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t('units_hint')}
            </p>
            <Button onClick={parsePaste} disabled={!paste.trim()} className="mt-3">
              {t('paste_parse')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
