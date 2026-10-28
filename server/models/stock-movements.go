package models

import "time"

type StockMovement struct {
	ID        int64     `json:"id" gorm:"primaryKey"`
	ProductID int64     `json:"product_id" gorm:"not null;index"`
	Product   *Product  `json:"product,omitempty" gorm:"foreignKey:ProductID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
	Type      string    `json:"type" gorm:"not null"`
	Qty       int       `json:"qty" gorm:"not null"`
	Note      string    `json:"note"`
	CreatedAt time.Time `json:"created_at" gorm:"not null"`
}
