'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import {
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  CalendarPlus,
  Wallet,
  StickyNote,
  KeyRound,
  Download,
  Ban,
  Play,
  Trash2,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  ChangePlanDialog,
  RecordPaymentDialog,
  TrialDialog,
  AddNoteDialog,
  PasswordResetDialog,
  ConfirmActionDialog,
  HardDeleteDialog,
  BTN_GHOST,
  BTN_DANGER,
} from './tenant-dialogs'
import {
  enterTenant,
  suspendTenant,
  reactivateTenant,
  softDeleteTenant,
} from '@/app/[locale]/admin/(console)/tenants/actions'
import type { Plan, TenantStatus } from '@/types/database'

export interface TenantControlTarget {
  id: string
  slug: string
  name: string
  status: TenantStatus
  plan_tier: string
  trial_ends_at: string | null
}

type DialogKind =
  | null
  | 'plan'
  | 'payment'
  | 'note'
  | 'password'
  | 'extend'
  | 'suspend'
  | 'reactivate'
  | 'softdelete'
  | 'harddelete'

export function TenantControls({
  variant,
  tenant,
  locale,
  plans,
  canManage,
}: {
  variant: 'menu' | 'bar'
  tenant: TenantControlTarget
  locale: string
  plans: Plan[]
  canManage: boolean
}) {
  const t = useTranslations('admin.tenant_detail')
  const [dialog, setDialog] = React.useState<DialogKind>(null)
  const [, start] = React.useTransition()
  const exportHref = `/api/admin/tenants/${tenant.id}/export`
  const isTrial = tenant.status === 'trial'
  // Blocked = no app access; reactivate / record-payment / grant-trial revives it.
  const isBlocked = tenant.status === 'suspended' || tenant.status === 'churned'

  const dialogs = (
    <>
      <ChangePlanDialog
        open={dialog === 'plan'}
        onOpenChange={(o) => setDialog(o ? 'plan' : null)}
        locale={locale}
        tenantId={tenant.id}
        currentPlan={tenant.plan_tier}
        plans={plans}
      />
      <RecordPaymentDialog
        open={dialog === 'payment'}
        onOpenChange={(o) => setDialog(o ? 'payment' : null)}
        locale={locale}
        tenantId={tenant.id}
        plans={plans}
        defaultPlan={tenant.plan_tier}
      />
      <AddNoteDialog
        open={dialog === 'note'}
        onOpenChange={(o) => setDialog(o ? 'note' : null)}
        locale={locale}
        tenantId={tenant.id}
      />
      <PasswordResetDialog
        open={dialog === 'password'}
        onOpenChange={(o) => setDialog(o ? 'password' : null)}
        locale={locale}
        tenantId={tenant.id}
      />
      <TrialDialog
        open={dialog === 'extend'}
        onOpenChange={(o) => setDialog(o ? 'extend' : null)}
        locale={locale}
        tenantId={tenant.id}
        currentEnd={tenant.trial_ends_at}
        isTrial={isTrial}
      />
      <ConfirmActionDialog
        open={dialog === 'suspend'}
        onOpenChange={(o) => setDialog(o ? 'suspend' : null)}
        title={t('suspend')}
        description={t('suspend_desc')}
        confirmLabel={t('suspend')}
        danger
        onConfirm={() => suspendTenant(locale, tenant.id)}
      />
      <ConfirmActionDialog
        open={dialog === 'reactivate'}
        onOpenChange={(o) => setDialog(o ? 'reactivate' : null)}
        title={t('reactivate')}
        description={t('reactivate_desc')}
        confirmLabel={t('reactivate')}
        onConfirm={() => reactivateTenant(locale, tenant.id)}
      />
      <ConfirmActionDialog
        open={dialog === 'softdelete'}
        onOpenChange={(o) => setDialog(o ? 'softdelete' : null)}
        title={t('delete')}
        description={t('delete_desc')}
        confirmLabel={t('delete')}
        danger
        onConfirm={() => softDeleteTenant(locale, tenant.id)}
      />
      <HardDeleteDialog
        open={dialog === 'harddelete'}
        onOpenChange={(o) => setDialog(o ? 'harddelete' : null)}
        locale={locale}
        tenantId={tenant.id}
        slug={tenant.slug}
      />
    </>
  )

  if (variant === 'menu') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/tenants/${tenant.id}`}>
                <Eye className="h-4 w-4" /> {t('view')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                start(() => enterTenant(locale, tenant.id))
              }}
            >
              <Eye className="h-4 w-4" /> {t('impersonate')}
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem onSelect={() => setDialog('plan')}>
                <ArrowUpDown className="h-4 w-4" /> {t('change_plan')}
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem onSelect={() => setDialog('extend')}>
                <CalendarPlus className="h-4 w-4" />{' '}
                {isTrial ? t('extend_trial') : t('grant_trial')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => setDialog('payment')}>
              <Wallet className="h-4 w-4" /> {t('record_payment')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('note')}>
              <StickyNote className="h-4 w-4" /> {t('add_note')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog('password')}>
              <KeyRound className="h-4 w-4" /> {t('password_reset')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exportHref}>
                <Download className="h-4 w-4" /> {t('export')}
              </a>
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                {isBlocked ? (
                  <DropdownMenuItem onSelect={() => setDialog('reactivate')}>
                    <Play className="h-4 w-4" /> {t('reactivate')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setDialog('suspend')}>
                    <Ban className="h-4 w-4" /> {t('suspend')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="danger" onSelect={() => setDialog('softdelete')}>
                  <Trash2 className="h-4 w-4" /> {t('delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {dialogs}
      </>
    )
  }

  // variant === 'bar' (tenant detail action bar)
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => start(() => enterTenant(locale, tenant.id))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-[#04231A] transition-colors hover:bg-brand-hover"
        >
          <Eye className="h-4 w-4" /> {t('impersonate')}
        </button>
        {canManage && (
          <button type="button" onClick={() => setDialog('plan')} className={BTN_GHOST}>
            {t('change_plan')}
          </button>
        )}
        {canManage && (
          <button type="button" onClick={() => setDialog('extend')} className={BTN_GHOST}>
            {isTrial ? t('extend_trial') : t('grant_trial')}
          </button>
        )}
        <button type="button" onClick={() => setDialog('note')} className={BTN_GHOST}>
          {t('add_note')}
        </button>
        <button type="button" onClick={() => setDialog('payment')} className={BTN_GHOST}>
          {t('record_payment')}
        </button>
        <button type="button" onClick={() => setDialog('password')} className={BTN_GHOST}>
          {t('password_reset')}
        </button>
        <a href={exportHref} className={BTN_GHOST}>
          <Download className="mr-1.5 h-4 w-4" /> {t('export')}
        </a>
        {canManage &&
          (isBlocked ? (
            <button type="button" onClick={() => setDialog('reactivate')} className={BTN_GHOST}>
              {t('reactivate')}
            </button>
          ) : (
            <button type="button" onClick={() => setDialog('suspend')} className={BTN_DANGER}>
              {t('suspend')}
            </button>
          ))}
        {canManage && (
          <button
            type="button"
            onClick={() => setDialog('harddelete')}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-red-500/30 px-3 text-sm text-[#F08C8C] transition-colors hover:bg-red-500/10"
          >
            {t('hard_delete')}
          </button>
        )}
      </div>
      {dialogs}
    </>
  )
}
