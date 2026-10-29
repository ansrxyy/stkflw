import { useCallback, useEffect, useState } from 'react'
import type { SummaryData } from './types'
import { api } from './api/client'
import { SummaryCards } from './components/SummaryCards'
import { ProductsView } from './components/ProductsView'

export function App() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.getSummary()
      setSummary(res.data)
    } catch {
      // Summary error handled gracefully
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'products'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Products & Stock
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'orders'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Sales Orders
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SummaryCards summary={summary} loading={summaryLoading} />
        {activeTab === 'products' && (
          <ProductsView onMutationSuccess={fetchSummary} />
        )}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Sales Orders Module</h3>
            <p className="text-sm text-gray-500">
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
