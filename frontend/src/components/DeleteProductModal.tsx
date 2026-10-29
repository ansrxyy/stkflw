import { useState } from 'react'
import type { Product } from '../types'
import { api, ApiClientError } from '../api/client'

interface DeleteProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteProductModal({ product, isOpen, onClose, onSuccess }: DeleteProductModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !product) return null

  const handleDelete = async () => {
    setDeleting(true)
    setErrorMessage(null)
    try {
      await api.deleteProduct(product.id)
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'PRODUCT_HAS_HISTORY') {
          setErrorMessage(
            'Cannot delete product: This product has stock movement history. History is never deleted.'
          )
        } else {
          setErrorMessage(err.message || 'Failed to delete product')
        }
      } else {
        setErrorMessage('An unexpected error occurred')
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{product.name}</span> ({product.sku})?
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 shadow-sm"
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
