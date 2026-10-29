import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { api, ApiClientError } from '../api/client'

interface ProductModalProps {
  product?: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ProductModal({ product, isOpen, onClose, onSuccess }: ProductModalProps) {
  const isEditing = Boolean(product)

  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [stock, setStock] = useState<number>(0)
  const [isActive, setIsActive] = useState<boolean>(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setSku(product.sku)
      setName(product.name)
      setPrice(product.price)
      setStock(product.stock)
      setIsActive(product.is_active)
    } else {
      setSku('')
      setName('')
      setPrice(0)
      setStock(0)
      setIsActive(true)
    }
    setErrorMessage(null)
  }, [product, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!isEditing && !sku.trim()) {
      setErrorMessage('SKU is required')
      return
    }
    if (!name.trim()) {
      setErrorMessage('Product name is required')
      return
    }
    if (price < 0) {
      setErrorMessage('Price cannot be negative')
      return
    }

    setSaving(true)
    try {
      if (isEditing && product) {
        await api.updateProduct(product.id, {
          name: name.trim(),
          price,
          is_active: isActive,
        })
      } else {
        await api.createProduct({
          sku: sku.trim(),
          name: name.trim(),
          price,
          stock: stock >= 0 ? stock : 0,
        })
      }
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message || 'Operation failed')
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
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label htmlFor="product-sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU {isEditing && <span className="text-xs text-gray-400 font-normal">(Cannot be changed)</span>}
            </label>
            <input
              id="product-sku"
              type="text"
              value={sku}
              disabled={isEditing}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. LAPTOP-PRO-14"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Wireless Ergonomic Mouse"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (IDR)
            </label>
            <input
              id="product-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 mb-1">
                Initial Stock
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="product-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="product-active" className="text-sm font-medium text-gray-700">
                Product is active (available for sale)
              </label>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-gray-200">
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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
