package models

import "time"

type SalesOrder struct {
	ID          int64            `json:"id" gorm:"primaryKey"`
	Customer    string           `json:"customer" gorm:"not null"`
	Status      string           `json:"status" gorm:"default:'CREATED';not null"`
	Total       int              `json:"total" gorm:"not null"`
	CreatedAt   time.Time        `json:"created_at" gorm:"not null"`
	CancelledAt *time.Time       `json:"cancelled_at"`
	Items       []SalesOrderItem `json:"items" gorm:"foreignKey:OrderID"`
}
