package service

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"ansarfadillah.tech/stkflw/dto"
	"ansarfadillah.tech/stkflw/models"
	"ansarfadillah.tech/stkflw/repository"
	"gorm.io/gorm"
)

var (
	ErrProductNotFound   = dto.NewAppError(http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
	ErrProductHasHistory = dto.NewAppError(http.StatusConflict, "PRODUCT_HAS_HISTORY", "Cannot delete product with movement history")
	ErrSKUAlreadyExists  = dto.NewAppError(http.StatusConflict, "SKU_ALREADY_EXISTS", "A product with this SKU already exists")
	ErrInvalidSKU        = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "SKU is required")
	ErrInvalidName       = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Name is required")
	ErrInvalidPrice      = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Price must be a non-negative integer")
	ErrInvalidStock      = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Stock cannot be negative")
)

type IProductService interface {
	ListProducts(req dto.ListProductsRequest) (dto.ListProductsResponse, error)
	CreateProduct(req dto.CreateProductRequest) (*models.Product, error)
	GetProduct(id int64) (*models.Product, error)
	UpdateProduct(id int64, req dto.UpdateProductRequest) (*models.Product, error)
	DeleteProduct(id int64) error
}

type ProductService struct {
	productRepo repository.IProductRepository
}

func NewProductService(productRepo repository.IProductRepository) *ProductService {
	return &ProductService{
		productRepo: productRepo,
	}
}

func (s *ProductService) ListProducts(req dto.ListProductsRequest) (dto.ListProductsResponse, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}

	filter := repository.ListProductsFilter{
		Search: strings.TrimSpace(req.Search),
		Filter: strings.TrimSpace(req.Filter),
		Page:   req.Page,
		Limit:  req.Limit,
	}

	products, total, err := s.productRepo.ListProducts(filter)
	if err != nil {
		return dto.ListProductsResponse{}, dto.InternalError(err)
	}

	return dto.NewPaginatedResponse(products, req.Page, req.Limit, total), nil
}

func (s *ProductService) CreateProduct(req dto.CreateProductRequest) (*models.Product, error) {
	sku := strings.TrimSpace(req.SKU)
	if sku == "" {
		return nil, ErrInvalidSKU
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, ErrInvalidName
	}

	if req.Price < 0 {
		return nil, ErrInvalidPrice
	}

	if req.Stock < 0 {
		return nil, ErrInvalidStock
	}

	_, err := s.productRepo.GetProductBySKU(sku)
	if err == nil {
		return nil, ErrSKUAlreadyExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, dto.InternalError(err)
	}

	product := models.Product{
		SKU:       sku,
		Name:      name,
		Price:     req.Price,
		Stock:     req.Stock,
		IsActive:  true,
		CreatedAt: time.Now(),
	}

	if err := s.productRepo.CreateProduct(&product); err != nil {
		return nil, dto.InternalError(err)
	}

	return &product, nil
}

func (s *ProductService) GetProduct(id int64) (*models.Product, error) {
	p, err := s.productRepo.GetProduct(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, dto.InternalError(err)
	}
	return p, nil
}

func (s *ProductService) UpdateProduct(id int64, req dto.UpdateProductRequest) (*models.Product, error) {
	p, err := s.productRepo.GetProduct(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, dto.InternalError(err)
	}

	name := strings.TrimSpace(req.Name)
	if name != "" {
		p.Name = name
	}

	if req.Price >= 0 {
		p.Price = req.Price
	} else {
		return nil, ErrInvalidPrice
	}

	if req.IsActive != nil {
		p.IsActive = *req.IsActive
	}

	if err := s.productRepo.UpdateProduct(p); err != nil {
		return nil, dto.InternalError(err)
	}

	return p, nil
}

func (s *ProductService) DeleteProduct(id int64) error {
	_, err := s.productRepo.GetProduct(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProductNotFound
		}
		return dto.InternalError(err)
	}

	hasHistory, err := s.productRepo.HasMovementHistory(id)
	if err != nil {
		return dto.InternalError(err)
	}
	if hasHistory {
		return ErrProductHasHistory
	}

	if err := s.productRepo.DeleteProduct(id); err != nil {
		return dto.InternalError(err)
	}

	return nil
}
