package repository

import (
	"ansarfadillah.tech/stkflw/models"
	"gorm.io/gorm"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepo(db *gorm.DB) *ProductRepository {
	return &ProductRepository{
		db: db,
	}
}

type IProductRepository interface {
	ListProducts() ([]models.Product, error)
}

func (r *ProductRepository) ListProducts() ([]models.Product, error) {
	var products []models.Product
	result := r.db.Find(&products)
	if result.Error != nil {
		return nil, result.Error
	}
	return products, nil
}
