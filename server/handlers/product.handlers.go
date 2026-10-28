package handlers

import (
	"ansarfadillah.tech/stkflw/models"
	"ansarfadillah.tech/stkflw/service"
)

type ProductHandler struct {
	productService *service.IProductService
}

func NewProductHandler(productService service.IProductService) *ProductHandler {
	return &ProductHandler{
		productService: &productService,
	}
}

func (h *ProductHandler) ListProducts() ([]models.Product, error) {
	products, err := (*h.productService).ListProducts()
	if err != nil {
		return nil, err
	}
	return products, nil
}
