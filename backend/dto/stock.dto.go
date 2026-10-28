package dto

type AdjustStockRequest struct {
	Type string `json:"type"` // "in" or "out"
	Qty  int    `json:"qty"`  // integer > 0
	Note string `json:"note"`
}
