import type { SummaryData } from '../types'
import { formatIDR } from '../utils/formatters'

interface SummaryCardsProps {
  summary: SummaryData | null
  loading: boolean
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  if (loading && !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-7 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Total Products',
      value: summary?.total_products ?? 0,
      badge: 'All registered',
      badgeColor: 'bg-gray-100 text-gray-700',
    },
    {
      title: 'Active Products',
      value: summary?.active_products ?? 0,
      badge: 'In catalog',
      badgeColor: 'bg-green-100 text-green-700',
    },
    {
      title: 'Total Stock Value',
      value: formatIDR(summary?.total_stock_value ?? 0),
      badge: 'Inventory value',
      badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Low Stock Items',
      value: summary?.low_stock_count ?? 0,
      badge: 'Stock ≤ 10',
      badgeColor: (summary?.low_stock_count ?? 0) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.title} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">{c.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badgeColor}`}>
              {c.badge}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{c.value}</div>
        </div>
      ))}
    </div>
  )
}
