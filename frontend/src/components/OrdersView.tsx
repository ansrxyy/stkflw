import { useCallback, useEffect, useState } from 'react'
import type { OrderFilterType, SalesOrder } from '../types'
import { api, ApiClientError } from '../api/client'
import { formatDateTime, formatIDR } from '../utils/formatters'
import { useDebounce } from '../hooks/useDebounce'
import { CreateOrderModal } from './CreateOrderModal'
import { OrderDetailModal } from './OrderDetailModal'

interface OrdersViewProps {
  onMutationSuccess: () => void
}

export function OrdersView({ onMutationSuccess }: OrdersViewProps) {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 350)
  const [statusFilter, setStatusFilter] = useState<OrderFilterType>('ALL')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const limit = 10

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await api.getOrders({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter,
        page,
        limit,
      })
      setOrders(res.data)
      setTotalPages(res.meta?.total_pages || Math.ceil(res.total / limit) || 1)
      setTotalCount(res.total)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'Failed to load sales orders')
      } else {
        setErrorMessage('Failed to connect to the server')
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  const handleOrderCreated = (order: SalesOrder) => {
    setSuccessBanner(
      `Order #${order.id} for "${order.customer}" created successfully! Server Total: ${formatIDR(
        order.total
      )}`
    )
    fetchOrders()
    onMutationSuccess()
  }

  const handleOrderCancelled = () => {
    setSuccessBanner('Order was cancelled successfully and stock was restored.')
    fetchOrders()
    onMutationSuccess()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {successBanner && (
        <div className="bg-green-50 border-b border-green-200 p-3 px-4 flex items-center justify-between text-sm text-green-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-700">&#10003;</span>
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-green-600 hover:text-green-800 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-md text-xs font-medium">
            {(
              [
                { id: 'ALL', label: 'All Orders' },
                { id: 'CREATED', label: 'Active (Created)' },
                { id: 'CANCELLED', label: 'Cancelled' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
          >
            <span>+</span> Create Order
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-3"></div>
          <div className="text-sm font-medium">Loading sales orders...</div>
        </div>
      ) : errorMessage ? (
        <div className="p-12 text-center">
          <div className="text-red-500 font-semibold mb-2">Error Loading Orders</div>
          <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="text-base font-semibold text-gray-700 mb-1">No orders found</div>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try adjusting your customer search or status filter.'
              : 'Create your first sales order to start recording sales.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
              }}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Server Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {orders.map((o) => {
                  const isCancelled = o.status === 'CANCELLED'
                  const itemsCount = o.items?.reduce((sum, it) => sum + it.qty, 0) || 0

                  return (
                    <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">#{o.id}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{o.customer}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <span className="font-semibold text-gray-800">{itemsCount} units</span>
                        <span className="text-gray-400 ml-1">
                          ({o.items?.length || 0} SKU{o.items?.length !== 1 ? 's' : ''})
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatIDR(o.total)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isCancelled
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(o.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold text-gray-900">{orders.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {isCreateOpen && (
        <CreateOrderModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleOrderCreated}
        />
      )}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          onOrderCancelled={handleOrderCancelled}
        />
      )}
    </div>
  )
}
