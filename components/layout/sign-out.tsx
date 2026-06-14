'use client'

import { useFormStatus, createPortal } from 'react-dom'
import { LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StoklyLogo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

type Variant = 'admin' | 'tenant'

// Six-spoke version of the Stokly mark where each spoke fades on a staggered
// loop — the asterisk reads as a spinner while the sign-out action runs.
function StoklySpinner({ size = 52 }: { size?: number }) {
  const spokes = []
  for (let i = 0; i < 6; i++) {
    const a = ((i * 60 + 8) * Math.PI) / 180
    const x1 = 24 + Math.cos(a) * 5.5
    const y1 = 24 + Math.sin(a) * 5.5
    const x2 = 24 + Math.cos(a) * 19
    const y2 = 24 + Math.sin(a) * 19
    spokes.push(
      <line
        key={i}
        x1={x1.toFixed(2)}
        y1={y1.toFixed(2)}
        x2={x2.toFixed(2)}
        y2={y2.toFixed(2)}
        className="stokly-spoke"
        style={{ animationDelay: `${-(5 - i) * 0.13}s` }}
      />
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="#00C896"
      strokeWidth="7"
      strokeLinecap="round"
      aria-hidden
    >
      {spokes}
    </svg>
  )
}

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
      <StoklySpinner />
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
