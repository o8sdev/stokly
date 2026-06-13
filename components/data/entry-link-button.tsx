import { Plus } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'

// "+ Qeyd et" header action on a journal page — the entry form lives one click
// away instead of as its own sidebar row, so the journal is the single home for
// each domain (sales / purchases / waste).
export function EntryLinkButton({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Button asChild size="sm" className="gap-2">
      <Link href={href}>
        <Plus className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  )
}
