package dto

type OrderItemRequest struct {
	SKU string `json:"sku"`
	Qty int    `json:"qty"`
}

type CreateOrderRequest struct {
	Customer string             `json:"customer"`
	Items    []OrderItemRequest `json:"items"`
}

type ListOrdersRequest struct {
	Search string `form:"search"`
	Status string `form:"status"`
	Page   int    `form:"page"`
	Limit  int    `form:"limit"`
}

type SummaryResponse struct {
	TotalProducts   int64 `json:"total_products"`
	ActiveProducts  int64 `json:"active_products"`
	TotalStockValue int64 `json:"total_stock_value"`
	LowStockCount   int64 `json:"low_stock_count"`
}

type DailySalesItem struct {
	OrderID   int64  `json:"order_id"`
	Customer  string `json:"customer"`
	Total     int    `json:"total"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type DailySalesReportResponse struct {
	Date         string           `json:"date"`
	TotalRevenue int64            `json:"total_revenue"`
	TotalOrders  int64            `json:"total_orders"`
	Orders       []DailySalesItem `json:"orders"`
}
