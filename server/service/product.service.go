package service

import (
	"ansarfadillah.tech/stkflw/models"
	"ansarfadillah.tech/stkflw/repository"
)

type IProductService interface {
	ListProducts() ([]models.Product, error)
}

type ProductService struct {
	productRepo repository.IProductRepository
}

func NewProductService(productRepo repository.IProductRepository) *ProductService {
	return &ProductService{
		productRepo: productRepo,
	}
}

func (s *ProductService) ListProducts() ([]models.Product, error) {
	return s.productRepo.ListProducts()
}
