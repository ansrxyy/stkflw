import { useEffect, useState } from 'react'
import type { Product, StockMovement } from '../types'
import { api, ApiClientError } from '../api/client'
import { formatDateTime } from '../utils/formatters'

interface MovementHistoryModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function MovementHistoryModal({ product, isOpen, onClose }: MovementHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product && isOpen) {
      setLoading(true)
      setErrorMessage(null)
      api
        .getProductMovements(product.id)
        .then((res) => setMovements(res.data))
        .catch((err) => {
          if (err instanceof ApiClientError) {
            setErrorMessage(err.message)
          } else {
            setErrorMessage('Failed to load history')
          }
        })
        .finally(() => setLoading(false))
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Stock Movements History</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {product.name} ({product.sku})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="my-4 max-h-96 overflow-y-auto">
          {loading && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Loading movement history...
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && movements.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No stock movements recorded for this product yet.
            </div>
          )}

          {!loading && movements.length > 0 && (
            <div className="divide-y divide-gray-100">
              {movements.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        m.type === 'in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.type === 'in' ? '+ IN' : '- OUT'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-800">
                        {m.qty} unit{m.qty > 1 ? 's' : ''}
                      </div>
                      {m.note && <div className="text-xs text-gray-500">{m.note}</div>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{formatDateTime(m.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
