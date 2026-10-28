package models

func AllModels() []interface{} {
	return []interface{}{
		&Product{},
		&SalesOrderItem{},
		&SalesOrder{},
		&StockMovement{},
	}
}
