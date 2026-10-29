package repository

import (
	"strings"
	"time"

	"ansarfadillah.tech/stkflw/dto"
	"ansarfadillah.tech/stkflw/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IOrderRepository interface {
	CreateOrder(tx *gorm.DB, order *models.SalesOrder) error
	GetOrderByID(id int64) (*models.SalesOrder, error)
	GetOrderWithLock(tx *gorm.DB, id int64) (*models.SalesOrder, error)
	GetOrderByIdempotencyKey(key string) (*models.SalesOrder, error)
	ListOrders(search, status string, page, limit int) ([]models.SalesOrder, int64, error)
	UpdateOrderStatus(tx *gorm.DB, id int64, status string, cancelledAt time.Time) error
	GetSummary() (dto.SummaryResponse, error)
	GetDailySalesReport(date string) (dto.DailySalesReportResponse, error)
	GetDB() *gorm.DB
}

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepo(db *gorm.DB) *OrderRepository {
	return &OrderRepository{
		db: db,
	}
}

func (r *OrderRepository) GetDB() *gorm.DB {
	return r.db
}

func (r *OrderRepository) CreateOrder(tx *gorm.DB, order *models.SalesOrder) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Create(order).Error
}

func (r *OrderRepository) GetOrderByID(id int64) (*models.SalesOrder, error) {
	var order models.SalesOrder
	err := r.db.Preload("Items.Product").First(&order, id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) GetOrderWithLock(tx *gorm.DB, id int64) (*models.SalesOrder, error) {
	db := tx
	if db == nil {
		db = r.db
	}
	var order models.SalesOrder
	err := db.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&order, id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) GetOrderByIdempotencyKey(key string) (*models.SalesOrder, error) {
	var order models.SalesOrder
	err := r.db.Preload("Items.Product").Where("idempotency_key = ?", key).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) ListOrders(search, status string, page, limit int) ([]models.SalesOrder, int64, error) {
	var orders []models.SalesOrder
	var total int64

	query := r.db.Model(&models.SalesOrder{})

	if search != "" {
		s := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(customer) LIKE ?", s)
	}

	if status != "" && status != "ALL" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	err := query.Preload("Items.Product").
		Order("created_at DESC, id DESC").
		Offset(offset).
		Limit(limit).
		Find(&orders).Error

	if err != nil {
		return nil, 0, err
	}

	if orders == nil {
		orders = []models.SalesOrder{}
	}

	return orders, total, nil
}

func (r *OrderRepository) UpdateOrderStatus(tx *gorm.DB, id int64, status string, cancelledAt time.Time) error {
	db := tx
	if db == nil {
		db = r.db
	}
	return db.Model(&models.SalesOrder{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       status,
		"cancelled_at": cancelledAt,
	}).Error
}

func (r *OrderRepository) GetSummary() (dto.SummaryResponse, error) {
	var summary dto.SummaryResponse

	// Total products
	if err := r.db.Model(&models.Product{}).Count(&summary.TotalProducts).Error; err != nil {
		return summary, err
	}

	// Active products
	if err := r.db.Model(&models.Product{}).Where("is_active = ?", true).Count(&summary.ActiveProducts).Error; err != nil {
		return summary, err
	}

	// Low stock count (stock <= 10)
	if err := r.db.Model(&models.Product{}).Where("stock <= ?", 10).Count(&summary.LowStockCount).Error; err != nil {
		return summary, err
	}

	// Total stock value (sum of stock * price)
	type StockVal struct {
		Value *int64 `gorm:"column:val"`
	}
	var stockVal StockVal
	err := r.db.Model(&models.Product{}).Select("COALESCE(SUM(stock * price), 0) AS val").Scan(&stockVal).Error
	if err != nil {
		return summary, err
	}
	if stockVal.Value != nil {
		summary.TotalStockValue = *stockVal.Value
	}

	return summary, nil
}

func (r *OrderRepository) GetDailySalesReport(date string) (dto.DailySalesReportResponse, error) {
	var resp dto.DailySalesReportResponse
	resp.Date = date
	resp.Orders = []dto.DailySalesItem{}

	parsedDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		parsedDate = time.Now()
		resp.Date = parsedDate.Format("2006-01-02")
	}

	startOfDay := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, parsedDate.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	var orders []models.SalesOrder
	err = r.db.Where("created_at >= ? AND created_at < ? AND status = ?", startOfDay, endOfDay, "CREATED").
		Order("created_at DESC").
		Find(&orders).Error
	if err != nil {
		return resp, err
	}

	resp.TotalOrders = int64(len(orders))
	for _, o := range orders {
		resp.TotalRevenue += int64(o.Total)
		resp.Orders = append(resp.Orders, dto.DailySalesItem{
			OrderID:   o.ID,
			Customer:  o.Customer,
			Total:     o.Total,
			Status:    o.Status,
			CreatedAt: o.CreatedAt.Format(time.RFC3339),
		})
	}

	return resp, nil
}
