import type {
  Product,
  PaginatedResponse,
  BaseResponse,
  CreateProductRequest,
  UpdateProductRequest,
  AdjustStockRequest,
  StockMovement,
  SummaryData,
  ProductFilterType,
  ApiErrorPayload,
} from '../types'

export class ApiClientError extends Error {
  status: number
  code: string
  available?: number
  sku?: string

  constructor(status: number, code: string, message: string, available?: number, sku?: string) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.available = available
    this.sku = sku
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('/api') ? path : `/api${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })
  if (response.status === 204) {
    return {} as T
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
  }

  if (!response.ok) {
    const errorPayload = data as ApiErrorPayload | null
    const errInfo = errorPayload?.error

    const code = errInfo?.code || `HTTP_${response.status}`
    const message = errInfo?.message || response.statusText || 'Request failed'
    const available = errInfo?.available
    const sku = errInfo?.sku

    throw new ApiClientError(response.status, code, message, available, sku)
  }

  return data as T
}

export const api = {
  // Products
  async getProducts(params: {
    search?: string
    filter?: ProductFilterType
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Product>> {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.filter && params.filter !== 'all') searchParams.set('filter', params.filter)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))

    const queryString = searchParams.toString()
    return request<PaginatedResponse<Product>>(`/products${queryString ? `?${queryString}` : ''}`)
  },

  async createProduct(data: CreateProductRequest): Promise<BaseResponse<Product>> {
    return request<BaseResponse<Product>>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateProduct(id: number, data: UpdateProductRequest): Promise<BaseResponse<Product>> {
    return request<BaseResponse<Product>>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async deleteProduct(id: number): Promise<BaseResponse<string>> {
    return request<BaseResponse<string>>(`/products/${id}`, {
      method: 'DELETE',
    })
  },

  // Stock Adjustments
  async adjustStock(id: number, data: AdjustStockRequest): Promise<BaseResponse<Product>> {
    return request<BaseResponse<Product>>(`/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getProductMovements(id: number): Promise<{ data: StockMovement[] }> {
    return request<{ data: StockMovement[] }>(`/products/${id}/movements`)
  },

  // Summary
  async getSummary(): Promise<{ data: SummaryData }> {
    return request<{ data: SummaryData }>('/summary')
  },
}
