import { useEffect, useState } from 'react'
import type { Product, SalesOrder } from '../types'
import { api, ApiClientError } from '../api/client'
import { formatIDR } from '../utils/formatters'

interface OrderRowItem {
  id: string
  sku: string
  qty: number
}

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (order: SalesOrder) => void
}

export function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [customer, setCustomer] = useState('')
  const [items, setItems] = useState<OrderRowItem[]>([
    { id: '1', sku: '', qty: 1 },
  ])
  const [activeProducts, setActiveProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [failedSku, setFailedSku] = useState<string | null>(null)
  const [availableStock, setAvailableStock] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoadingProducts(true)
      api
        .getProducts({ filter: 'active', limit: 100 })
        .then((res) => setActiveProducts(res.data))
        .catch(() => setActiveProducts([]))
        .finally(() => setLoadingProducts(false))

      setCustomer('')
      setItems([{ id: '1', sku: '', qty: 1 }])
      setErrorMessage(null)
      setFailedSku(null)
      setAvailableStock(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: String(Date.now()), sku: '', qty: 1 },
    ])
  }

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleItemChange = (id: string, field: 'sku' | 'qty', value: string | number) => {
    setFailedSku(null)
    setAvailableStock(null)
    setErrorMessage(null)

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: value,
          }
        }
        return item
      })
    )
  }

  const estimatedTotal = items.reduce((sum, item) => {
    const prod = activeProducts.find((p) => p.sku === item.sku)
    if (prod && item.qty > 0) {
      return sum + prod.price * item.qty
    }
    return sum
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setFailedSku(null)
    setAvailableStock(null)

    if (!customer.trim()) {
      setErrorMessage('Customer name is required')
      return
    }

    if (items.length === 0) {
      setErrorMessage('At least one item is required')
      return
    }

    const seenSkus = new Set<string>()
    for (const it of items) {
      if (!it.sku.trim()) {
        setErrorMessage('All items must have a selected SKU')
        return
      }
      if (it.qty <= 0 || !Number.isInteger(it.qty)) {
        setErrorMessage(`Quantity for SKU ${it.sku} must be an integer greater than 0`)
        return
      }
      if (seenSkus.has(it.sku)) {
        setErrorMessage(`Duplicate SKU found: ${it.sku}. Please merge quantities.`)
        setFailedSku(it.sku)
        return
      }
      seenSkus.add(it.sku)
    }

    setSubmitting(true)

    const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    try {
      const created = await api.createOrder(
        {
          customer: customer.trim(),
          items: items.map((it) => ({
            sku: it.sku.trim(),
            qty: it.qty,
          })),
        },
        idempotencyKey
      )

      onSuccess(created)
      onClose()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INSUFFICIENT_STOCK') {
          setFailedSku(err.sku || null)
          setAvailableStock(err.available ?? null)
          setErrorMessage(
            err.sku && err.available !== undefined
              ? `Insufficient stock for SKU ${err.sku}: Only ${err.available} available.`
              : err.message || 'Insufficient stock for one or more items.'
          )
        } else {
          setErrorMessage(err.message || 'Validation error while creating order')
        }
      } else {
        setErrorMessage('An unexpected network error occurred')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl border border-gray-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create Sales Order</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Record a new sales order. Stock will be atomically deducted for all items.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="my-4 p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-800"
          >
            <div className="font-semibold">Cannot Create Order:</div>
            <div>{errorMessage}</div>
            {failedSku && availableStock !== null && (
              <div className="mt-1 text-xs text-red-700">
                Failed SKU: <span className="font-mono font-bold">{failedSku}</span> (Available:{' '}
                <span className="font-bold">{availableStock}</span>)
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label htmlFor="order-customer" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              id="order-customer"
              type="text"
              placeholder="e.g. PT Mandiri Perkasa / Budi Santoso"
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value)
                setErrorMessage(null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Order Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <span>+</span> Add Another Item
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {items.map((it) => {
                const prod = activeProducts.find((p) => p.sku === it.sku)
                const isItemFailed = failedSku === it.sku

                return (
                  <div
                    key={it.id}
                    className={`flex items-center gap-2 p-2.5 rounded-md border ${
                      isItemFailed
                        ? 'bg-red-50/70 border-red-400 ring-1 ring-red-400'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <select
                        value={it.sku}
                        onChange={(e) => handleItemChange(it.id, 'sku', e.target.value)}
                        className={`w-full px-2.5 py-1.5 border rounded text-sm bg-white focus:outline-none ${
                          isItemFailed ? 'border-red-400' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="">-- Select Product / SKU --</option>
                        {loadingProducts && <option disabled>Loading products...</option>}
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.sku}>
                            {p.sku} — {p.name} ({formatIDR(p.price)} | Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                      {isItemFailed && availableStock !== null && (
                        <div className="text-[11px] text-red-600 font-medium mt-1">
                          Insufficient: only {availableStock} available!
                        </div>
                      )}
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={it.qty}
                        onChange={(e) =>
                          handleItemChange(it.id, 'qty', parseInt(e.target.value) || 0)
                        }
                        placeholder="Qty"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none text-center"
                        required
                      />
                    </div>

                    <div className="w-28 text-right text-xs font-medium text-gray-700">
                      {prod ? formatIDR(prod.price * (it.qty || 0)) : '-'}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-20 disabled:hover:text-gray-400 text-lg leading-none"
                      title="Remove Item"
                    >
                      &times;
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider block">
                Estimated Server Total
              </span>
              <span className="text-xl font-bold text-gray-900">{formatIDR(estimatedTotal)}</span>
              <span className="text-[11px] text-gray-400 block">
                (Prices and total are securely finalized by the server)
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? 'Creating Order...' : 'Submit Order'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
