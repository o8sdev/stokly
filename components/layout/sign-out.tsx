'use client'

import { useFormStatus, createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StoklyLogo, StoklySpinner } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

type Variant = 'admin' | 'tenant'

// Full-screen branded "signing out…" curtain, rendered to <body> so no
// transformed/overflow-hidden ancestor can clip it.
function SignOutOverlay({ variant }: { variant: Variant }) {
  const t = useTranslations('common')
  if (typeof document === 'undefined') return null
  const dark = variant === 'admin'

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'stokly-logout-overlay fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6',
        dark ? 'bg-[#0a1622] text-white' : 'bg-background text-foreground'
      )}
    >
      <StoklySpinner size={52} color="#00C896" label={t('signing_out')} />
      <StoklyLogo tone={dark ? 'paper' : 'ink'} size="lg" />
      <p
        className={cn(
          'flex items-center gap-1.5 text-sm font-medium',
          dark ? 'text-slate-400' : 'text-muted-foreground'
        )}
      >
        {t('signing_out')}
        <span className="inline-flex items-center gap-0.5" aria-hidden>
          <span className="stokly-dot" />
          <span className="stokly-dot" style={{ animationDelay: '0.15s' }} />
          <span className="stokly-dot" style={{ animationDelay: '0.3s' }} />
        </span>
      </p>
    </div>,
    document.body
  )
}

function SubmitButton({
  label,
  className,
  variant,
}: {
  label: string
  className?: string
  variant: Variant
}) {
  const { pending } = useFormStatus()
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        title={label}
        aria-label={label}
        className={className}
      >
        <LogOut className="h-4 w-4" />
      </button>
      {pending && <SignOutOverlay variant={variant} />}
    </>
  )
}

// Drop-in replacement for a `<form action={onSignout}>` + sign-out button.
// While the server action runs (and redirects), a branded curtain makes the
// logout unmistakable.
export function SignOutButton({
  action,
  label,
  className,
  variant,
}: {
  action: () => Promise<void>
  label: string
  className?: string
  variant: Variant
}) {
  return (
    <form action={action}>
      <SubmitButton label={label} className={className} variant={variant} />
    </form>
  )
}
