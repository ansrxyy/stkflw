package models

type SalesOrderItem struct {
	ID        int64       `json:"id" gorm:"primaryKey"`
	OrderID   int64       `json:"order_id" gorm:"not null;index"`
	Order     *SalesOrder `json:"-" gorm:"foreignKey:OrderID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	ProductID int64       `json:"product_id" gorm:"not null;index"`
	Product   *Product    `json:"product,omitempty" gorm:"foreignKey:ProductID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
	SKU       string      `json:"sku" gorm:"not null"`
	Qty       int         `json:"qty" gorm:"not null"`
	UnitPrice int         `json:"unit_price" gorm:"not null"`
}
