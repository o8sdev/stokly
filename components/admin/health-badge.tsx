'use client'

import { useTranslations } from 'next-intl'
import { healthBadgeMeta } from '@/lib/admin/health-score'
import { cn } from '@/lib/utils'

export function HealthBadge({
  score,
  showScore = true,
  className,
}: {
  score: number
  showScore?: boolean
  className?: string
}) {
  const t = useTranslations('admin.health')
  const meta = healthBadgeMeta(score)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        meta.className,
        className
      )}
    >
      {showScore && <span className="font-mono">{score}</span>}
      {t(meta.i18nKey)}
    </span>
  )
}
