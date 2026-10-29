export interface Product {
  id: number
  sku: string
  name: string
  price: number
  stock: number
  is_active: boolean
  created_at: string
  last_movement_at: string | null
}

export interface StockMovement {
  id: number
  product_id: number
  type: 'in' | 'out'
  qty: number
  note: string | null
  created_at: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
  page: number
  limit: number
  total: number
}

export interface BaseResponse<T> {
  data?: T
  message?: string
  meta?: PaginationMeta
}

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    available?: number
    sku?: string
    details?: unknown
  }
}

export interface CreateProductRequest {
  sku: string
  name: string
  price: number
  stock?: number
}

export interface UpdateProductRequest {
  name: string
  price: number
  is_active?: boolean
}

export interface AdjustStockRequest {
  type: 'in' | 'out'
  qty: number
  note?: string
}

export interface SummaryData {
  total_products: number
  active_products: number
  total_stock_value: number
  low_stock_count: number
}

export type ProductFilterType = 'all' | 'active' | 'inactive' | 'low_stock'
