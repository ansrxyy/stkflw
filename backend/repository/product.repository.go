package repository

import (
	"strings"

	"ansarfadillah.tech/stkflw/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ListProductsFilter struct {
	Search string
	Filter string // "all", "active", "inactive", "low_stock"
	Page   int
	Limit  int
}

type IProductRepository interface {
	ListProducts(filter ListProductsFilter) ([]models.Product, int64, error)
	CreateProduct(p *models.Product) error
	GetProduct(id int64) (*models.Product, error)
	GetProductWithLock(tx *gorm.DB, id int64) (*models.Product, error)
	GetProductBySKU(sku string) (*models.Product, error)
	GetProductBySKUWithLock(tx *gorm.DB, sku string) (*models.Product, error)
	UpdateProduct(p *models.Product) error
	UpdateStock(tx *gorm.DB, id int64, newStock int) error
	DeleteProduct(id int64) error
	HasMovementHistory(productID int64) (bool, error)
	CreateMovement(tx *gorm.DB, movement *models.StockMovement) error
	GetMovements(productID int64) ([]models.StockMovement, error)
	GetDB() *gorm.DB
}

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepo(db *gorm.DB) *ProductRepository {
	return &ProductRepository{
		db: db,
	}
}

func (r *ProductRepository) GetDB() *gorm.DB {
	return r.db
}

func (r *ProductRepository) ListProducts(filter ListProductsFilter) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	countQuery := r.db.Model(&models.Product{})
	if filter.Search != "" {
		s := "%" + strings.ToLower(filter.Search) + "%"
		countQuery = countQuery.Where("LOWER(sku) LIKE ? OR LOWER(name) LIKE ?", s, s)
	}

	switch filter.Filter {
	case "active":
		countQuery = countQuery.Where("is_active = ?", true)
	case "inactive":
		countQuery = countQuery.Where("is_active = ?", false)
	case "low_stock":
		countQuery = countQuery.Where("stock <= ?", 10)
	}

	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page <= 0 {
		page = 1
	}
	limit := filter.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	dataQuery := r.db.Table("products").
		Select("products.*, (SELECT sm.created_at FROM stock_movements sm WHERE sm.product_id = products.id ORDER BY sm.created_at DESC LIMIT 1) AS last_movement_at")

	if filter.Search != "" {
		s := "%" + strings.ToLower(filter.Search) + "%"
		dataQuery = dataQuery.Where("LOWER(products.sku) LIKE ? OR LOWER(products.name) LIKE ?", s, s)
	}

	switch filter.Filter {
	case "active":
		dataQuery = dataQuery.Where("products.is_active = ?", true)
	case "inactive":
		dataQuery = dataQuery.Where("products.is_active = ?", false)
	case "low_stock":
		dataQuery = dataQuery.Where("products.stock <= ?", 10)
	}

	err := dataQuery.Order("products.created_at DESC").
		Offset(offset).
		Limit(limit).
		Scan(&products).Error

	if err != nil {
		return nil, 0, err
	}

	if products == nil {
		products = []models.Product{}
	}

	return products, total, nil
}

func (r *ProductRepository) CreateProduct(p *models.Product) error {
	return r.db.Create(p).Error
}

func (r *ProductRepository) GetProduct(id int64) (*models.Product, error) {
	var p models.Product
	err := r.db.Table("products").
		Select("products.*, (SELECT sm.created_at FROM stock_movements sm WHERE sm.product_id = products.id ORDER BY sm.created_at DESC LIMIT 1) AS last_movement_at").
		Where("products.id = ?", id).
		Scan(&p).Error
	if err != nil {
		return nil, err
	}
	if p.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &p, nil
}

func (r *ProductRepository) GetProductWithLock(tx *gorm.DB, id int64) (*models.Product, error) {
	db := tx
	if db == nil {
		db = r.db
	}
	var p models.Product
	err := db.Clauses(clause.Locking{Strength: "UPDATE"}).First(&p, id).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) GetProductBySKU(sku string) (*models.Product, error) {
	var p models.Product
	err := r.db.Table("products").
		Select("products.*, (SELECT sm.created_at FROM stock_movements sm WHERE sm.product_id = products.id ORDER BY sm.created_at DESC LIMIT 1) AS last_movement_at").
		Where("sku = ?", sku).
		Scan(&p).Error
	if err != nil {
		return nil, err
	}
	if p.ID == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &p, nil
}

func (r *ProductRepository) GetProductBySKUWithLock(tx *gorm.DB, sku string) (*models.Product, error) {
	db := tx
	if db == nil {
		db = r.db
	}
	var p models.Product
	err := db.Clauses(clause.Locking{Strength: "UPDATE"}).Where("sku = ?", sku).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *ProductRepository) UpdateProduct(p *models.Product) error {
	return r.db.Model(&models.Product{}).
		Where("id = ?", p.ID).
		Updates(map[string]interface{}{
			"name":      p.Name,
			"price":     p.Price,
			"is_active": p.IsActive,
		}).Error
}

func (r *ProductRepository) UpdateStock(tx *gorm.DB, id int64, newStock int) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Model(&models.Product{}).Where("id = ?", id).Update("stock", newStock).Error
}

func (r *ProductRepository) HasMovementHistory(productID int64) (bool, error) {
	var count int64
	err := r.db.Model(&models.StockMovement{}).Where("product_id = ?", productID).Count(&count).Error
	return count > 0, err
}

func (r *ProductRepository) DeleteProduct(id int64) error {
	return r.db.Delete(&models.Product{}, id).Error
}

func (r *ProductRepository) CreateMovement(tx *gorm.DB, movement *models.StockMovement) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Create(movement).Error
}

func (r *ProductRepository) GetMovements(productID int64) ([]models.StockMovement, error) {
	var movements []models.StockMovement
	err := r.db.Where("product_id = ?", productID).Order("created_at DESC, id DESC").Find(&movements).Error
	if movements == nil {
		movements = []models.StockMovement{}
	}
	return movements, err
}
