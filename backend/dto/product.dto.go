package dto

import "ansarfadillah.tech/stkflw/models"

type ListProductsRequest struct {
	Search string `form:"search"`
	Filter string `form:"filter"` // all, active, inactive, low_stock
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
}

type ListProductsResponse = PaginatedResponse[models.Product]

type CreateProductRequest struct {
	SKU   string `json:"sku"`
	Name  string `json:"name"`
	Price int    `json:"price"`
	Stock int    `json:"stock"`
}

type UpdateProductRequest struct {
	Name     string `json:"name"`
	Price    int    `json:"price"`
	IsActive *bool  `json:"is_active"`
}
