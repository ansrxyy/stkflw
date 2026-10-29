import { useState } from 'react'
import type { Product } from '../types'
import { api, ApiClientError } from '../api/client'

interface AdjustStockModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdjustStockModal({ product, isOpen, onClose, onSuccess }: AdjustStockModalProps) {
  const [type, setType] = useState<'in' | 'out'>('in')
  const [qty, setQty] = useState<number>(1)
  const [note, setNote] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [insufficientStock, setInsufficientStock] = useState<{ available: number; requested: number } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setInsufficientStock(null)

    if (qty <= 0 || !Number.isInteger(qty)) {
      setErrorMessage('Quantity must be a positive integer')
      return
    }

    setSaving(true)
    try {
      await api.adjustStock(product.id, {
        type,
        qty,
        note: note.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INSUFFICIENT_STOCK') {
          setInsufficientStock({
            available: err.available ?? product.stock,
            requested: qty,
          })
          setErrorMessage(
            `Insufficient Stock: Only ${err.available ?? product.stock} item(s) available in inventory.`
          )
        } else {
          setErrorMessage(err.message || 'Failed to adjust stock')
        }
      } else {
        setErrorMessage('An unexpected error occurred')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Adjust Stock</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="my-4 bg-gray-50 p-3 rounded border border-gray-200 text-sm">
          <div className="font-medium text-gray-900">{product.name}</div>
          <div className="text-gray-500 font-mono text-xs mt-0.5">SKU: {product.sku}</div>
          <div className="text-gray-600 mt-1">
            Current Stock: <span className="font-semibold text-gray-900">{product.stock}</span>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-800"
          >
            <div className="font-semibold">Adjustment Rejected:</div>
            <div>{errorMessage}</div>
            {insufficientStock && (
              <div className="mt-1 text-xs text-red-700">
                You requested <span className="font-bold">{insufficientStock.requested}</span>, but only{' '}
                <span className="font-bold">{insufficientStock.available}</span> can be deducted.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('in')
                  setErrorMessage(null)
                  setInsufficientStock(null)
                }}
                className={`py-2 px-4 rounded-md text-sm font-medium border text-center transition-colors ${
                  type === 'in'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Stock IN (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('out')
                  setErrorMessage(null)
                  setInsufficientStock(null)
                }}
                className={`py-2 px-4 rounded-md text-sm font-medium border text-center transition-colors ${
                  type === 'out'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Stock OUT (-)
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="adjust-qty" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              id="adjust-qty"
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => {
                setQty(parseInt(e.target.value) || 0)
                setErrorMessage(null)
                setInsufficientStock(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="adjust-note" className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              id="adjust-note"
              type="text"
              placeholder="e.g. Received shipment, Damaged item, Audit"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || qty <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
