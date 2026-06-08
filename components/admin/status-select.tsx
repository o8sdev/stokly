'use client'

import { useState, useTransition } from 'react'
import { updateDemoStatus } from '@/app/[locale]/admin/(console)/leads/actions'
import type { DemoRequestStatus } from '@/types/database'

const ORDER: DemoRequestStatus[] = ['new', 'contacted', 'sent', 'closed']

export function StatusSelect({
  locale,
  id,
  status,
  labels,
}: {
  locale: string
  id: string
  status: DemoRequestStatus
  labels: Record<DemoRequestStatus, string>
}) {
  const [value, setValue] = useState<DemoRequestStatus>(status)
  const [pending, startTransition] = useTransition()

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as DemoRequestStatus
        setValue(next)
        startTransition(() => updateDemoStatus(locale, id, next))
      }}
      className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white focus:border-brand focus:outline-none"
    >
      {ORDER.map((s) => (
        <option key={s} value={s} className="bg-[#122438]">
          {labels[s]}
        </option>
      ))}
    </select>
  )
}
