package models

import "time"

type Product struct {
	ID             int64           `json:"id" gorm:"primaryKey"`
	SKU            string          `json:"sku" gorm:"uniqueIndex;not null"`
	Name           string          `json:"name" gorm:"not null"`
	Price          int             `json:"price" gorm:"not null"`
	Stock          int             `json:"stock" gorm:"default:0;not null"`
	IsActive       bool            `json:"is_active" gorm:"default:true;not null"`
	CreatedAt      time.Time       `json:"created_at" gorm:"not null"`
	LastMovementAt *time.Time      `json:"last_movement_at" gorm:"-:all"`
	StockMovements []StockMovement `json:"stock_movements,omitempty" gorm:"foreignKey:ProductID"`
}
