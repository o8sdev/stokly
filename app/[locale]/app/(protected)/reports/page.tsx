import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BarChart3, Boxes, ClipboardList, Hourglass } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ReportsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale)
  const t = await getTranslations('reports')

  const cards = [
    {
      href: '/app/reports/food-cost',
      title: t('food_cost'),
      desc: t('food_cost_desc'),
      icon: BarChart3,
    },
    {
      href: '/app/reports/inventory-value',
      title: t('inventory_value'),
      desc: t('inventory_value_desc'),
      icon: Boxes,
    },
    {
      href: '/app/reports/period',
      title: t('period_reports'),
      desc: t('period_reports_desc'),
      icon: ClipboardList,
    },
    {
      href: '/app/reports/stock-aging',
      title: t('stock_aging'),
      desc: t('stock_aging_desc'),
      icon: Hourglass,
    },
  ]

  return (
    <div>
      <PageHeader title={t('title')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.href} href={c.href}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
