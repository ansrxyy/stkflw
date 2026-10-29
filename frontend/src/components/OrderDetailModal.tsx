import { useState } from 'react'
import type { SalesOrder } from '../types'
import { api, ApiClientError } from '../api/client'
import { formatDateTime, formatIDR } from '../utils/formatters'

interface OrderDetailModalProps {
  order: SalesOrder | null
  isOpen: boolean
  onClose: () => void
  onOrderCancelled: () => void
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onOrderCancelled,
}: OrderDetailModalProps) {
  const [cancelling, setCancelling] = useState(false)
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !order) return null

  const handleConfirmCancel = async () => {
    setCancelling(true)
    setErrorMessage(null)
    try {
      await api.cancelOrder(order.id)
      setShowConfirmCancel(false)
      onOrderCancelled()
      onClose()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'Failed to cancel order')
      } else {
        setErrorMessage('Failed to connect to the server')
      }
    } finally {
      setCancelling(false)
    }
  }

  const isCancelled = order.status === 'CANCELLED'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl border border-gray-200">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Order #{order.id}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isCancelled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Created on {formatDateTime(order.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 my-4 p-3.5 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <div>
            <span className="text-xs text-gray-500 block uppercase font-medium">Customer</span>
            <span className="font-semibold text-gray-900 text-base">{order.customer}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 block uppercase font-medium">Server Total</span>
            <span className="font-bold text-blue-700 text-base">{formatIDR(order.total)}</span>
          </div>
          {isCancelled && order.cancelled_at && (
            <div className="col-span-2 pt-2 border-t border-gray-200 text-xs text-red-700">
              Cancelled on: {formatDateTime(order.cancelled_at)} (Stock was restored to inventory)
            </div>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wider">
            Order Items ({order.items?.length || 0})
          </h4>
          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Product Name</th>
                  <th className="px-3 py-2 font-medium text-center">Qty</th>
                  <th className="px-3 py-2 font-medium text-right">Unit Price</th>
                  <th className="px-3 py-2 font-medium text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {order.items?.map((it) => (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-gray-800">
                      {it.sku}
                    </td>
                    <td className="px-3 py-2 text-gray-700 text-xs">
                      {it.product?.name || '-'}
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-gray-900">{it.qty}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-600">
                      {formatIDR(it.unit_price)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900 text-xs">
                      {formatIDR(it.unit_price * it.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showConfirmCancel && (
          <div className="my-3 p-3 bg-red-50 border border-red-300 rounded-md text-sm">
            <p className="font-semibold text-red-900 mb-1">Confirm Cancellation?</p>
            <p className="text-xs text-red-700 mb-3">
              Cancelling this order will restore all quantities back into product stock and record
              inward stock movements. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                disabled={cancelling}
                className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded bg-white text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
          <div>
            {!isCancelled && !showConfirmCancel && (
              <button
                type="button"
                onClick={() => setShowConfirmCancel(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200"
              >
                Cancel This Order
              </button>
            )}
          </div>
          <button
            type="button"
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
