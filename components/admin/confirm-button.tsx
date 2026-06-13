'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const BTN_GHOST =
  'inline-flex h-9 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-slate-300 transition-colors hover:bg-white/10'
const BTN_DANGER =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-500/90 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50'
const BTN_PRIMARY =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover disabled:opacity-50'

// Self-contained "are you sure?" wrapper for destructive / critical admin
// actions. Renders the trigger (children) and, on click, a confirm modal; the
// action runs only after the operator confirms. `action` may be a bound server
// action (passed from a server component) or any async client callback.
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel,
  danger = true,
  disabled = false,
  triggerClassName,
  triggerLabel,
  children,
}: {
  action: () => Promise<unknown> | void
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  disabled?: boolean
  triggerClassName?: string
  triggerLabel?: string
  children: React.ReactNode
}) {
  const t = useTranslations('admin.confirm')
  const [open, setOpen] = React.useState(false)
  const [pending, start] = React.useTransition()
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className={BTN_GHOST}
              onClick={() => setOpen(false)}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={pending}
              className={danger ? BTN_DANGER : BTN_PRIMARY}
              onClick={() =>
                start(async () => {
                  await action()
                  setOpen(false)
                })
              }
            >
              {confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
