import { useCallback, useEffect, useState } from 'react'
import type { Product, ProductFilterType } from '../types'
import { api, ApiClientError } from '../api/client'
import { formatIDR, timeAgo } from '../utils/formatters'
import { useDebounce } from '../hooks/useDebounce'
import { AdjustStockModal } from './AdjustStockModal'
import { ProductModal } from './ProductModal'
import { DeleteProductModal } from './DeleteProductModal'
import { MovementHistoryModal } from './MovementHistoryModal'

interface ProductsViewProps {
  onMutationSuccess: () => void
}

export function ProductsView({ onMutationSuccess }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const debouncedSearch = useDebounce(searchTerm, 350)
  const [filter, setFilter] = useState<ProductFilterType>('all')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number>(0)
  const limit = 10
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null)
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null)
  const [selectedProductForDelete, setSelectedProductForDelete] = useState<Product | null>(null)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await api.getProducts({
        search: debouncedSearch.trim() || undefined,
        filter,
        page,
        limit,
      })
      setProducts(res.data)
      setTotalPages(res.meta?.total_pages || Math.ceil(res.total / limit) || 1)
      setTotalCount(res.total)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'Failed to load products')
      } else {
        setErrorMessage('Failed to connect to the server')
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filter, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filter])

  const handleMutation = () => {
    fetchProducts()
    onMutationSuccess()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">\
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by SKU or name..."
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
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
                { id: 'low_stock', label: 'Low Stock (≤10)' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded transition-colors ${
                  filter === tab.id
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-xs flex items-center gap-1.5"
          >
            <span>+</span> Add Product
          </button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-3"></div>
          <div className="text-sm font-medium">Loading products...</div>
        </div>
      ) : errorMessage ? (
        <div className="p-12 text-center">
          <div className="text-red-500 font-semibold mb-2">Error Loading Products</div>
          <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 shadow-xs"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="text-base font-semibold text-gray-700 mb-1">No products found</div>
          <p className="text-sm text-gray-500 mb-4">
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search keywords or filter criteria.'
              : 'Get started by creating your first product.'}
          </p>
          {(searchTerm || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilter('all')
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
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Movement</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.map((p) => {
                  const isLow = p.stock <= 10
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-gray-900">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-700">{formatIDR(p.price)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            isLow ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {p.stock}
                          {isLow && <span className="ml-1 text-[10px] uppercase font-bold">(Low)</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(p.last_movement_at)}</td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProductForStock(p)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                        >
                          Adjust Stock
                        </button>
                        <button
                          onClick={() => setSelectedProductForHistory(p)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                        >
                          History
                        </button>
                        <button
                          onClick={() => setSelectedProductForEdit(p)}
                          className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setSelectedProductForDelete(p)}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                        >
                          Delete
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
              Showing <span className="font-semibold text-gray-900">{products.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> products
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
      {selectedProductForStock && (
        <AdjustStockModal
          product={selectedProductForStock}
          isOpen={Boolean(selectedProductForStock)}
          onClose={() => setSelectedProductForStock(null)}
          onSuccess={handleMutation}
        />
      )}

      {isAddModalOpen && (
        <ProductModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleMutation}
        />
      )}

      {selectedProductForEdit && (
        <ProductModal
          product={selectedProductForEdit}
          isOpen={Boolean(selectedProductForEdit)}
          onClose={() => setSelectedProductForEdit(null)}
          onSuccess={handleMutation}
        />
      )}

      {selectedProductForDelete && (
        <DeleteProductModal
          product={selectedProductForDelete}
          isOpen={Boolean(selectedProductForDelete)}
          onClose={() => setSelectedProductForDelete(null)}
          onSuccess={handleMutation}
        />
      )}

      {selectedProductForHistory && (
        <MovementHistoryModal
          product={selectedProductForHistory}
          isOpen={Boolean(selectedProductForHistory)}
          onClose={() => setSelectedProductForHistory(null)}
        />
      )}
    </div>
  )
}
