package service

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"ansarfadillah.tech/stkflw/dto"
	"ansarfadillah.tech/stkflw/models"
	"ansarfadillah.tech/stkflw/repository"
	"gorm.io/gorm"
)

var (
	ErrOrderNotFound   = dto.NewAppError(http.StatusNotFound, "ORDER_NOT_FOUND", "Order not found")
	ErrOrderCancelled  = dto.NewAppError(http.StatusConflict, "ALREADY_CANCELLED", "Order is already cancelled")
	ErrEmptyCustomer   = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Customer name is required")
	ErrEmptyOrderItems = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Order must contain at least one item")
	ErrInvalidOrderQty = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Item quantity must be greater than 0")
	ErrDuplicateSKU    = dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Duplicate SKU found in order items")
)

type IOrderService interface {
	CreateOrder(req dto.CreateOrderRequest, idempotencyKey string) (*models.SalesOrder, error)
	GetOrderByID(id int64) (*models.SalesOrder, error)
	CancelOrder(id int64) (*models.SalesOrder, error)
	ListOrders(req dto.ListOrdersRequest) (dto.PaginatedResponse[models.SalesOrder], error)
	GetSummary() (dto.SummaryResponse, error)
	GetDailySalesReport(date string) (dto.DailySalesReportResponse, error)
}

type OrderService struct {
	orderRepo   repository.IOrderRepository
	productRepo repository.IProductRepository
}

func NewOrderService(orderRepo repository.IOrderRepository, productRepo repository.IProductRepository) *OrderService {
	return &OrderService{
		orderRepo:   orderRepo,
		productRepo: productRepo,
	}
}

func (s *OrderService) CreateOrder(req dto.CreateOrderRequest, idempotencyKey string) (*models.SalesOrder, error) {
	customer := strings.TrimSpace(req.Customer)
	if customer == "" {
		return nil, ErrEmptyCustomer
	}

	if len(req.Items) == 0 {
		return nil, ErrEmptyOrderItems
	}

	// Check for duplicate SKUUU and invalid quantity
	seenSKUs := make(map[string]bool)
	cleanItems := make([]dto.OrderItemRequest, 0, len(req.Items))

	for _, item := range req.Items {
		sku := strings.TrimSpace(item.SKU)
		if sku == "" {
			return nil, dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", "Item SKU cannot be empty")
		}
		if item.Qty <= 0 {
			return nil, ErrInvalidOrderQty
		}
		if seenSKUs[sku] {
			return nil, dto.NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("Duplicate SKU in order: %s", sku))
		}
		seenSKUs[sku] = true
		cleanItems = append(cleanItems, dto.OrderItemRequest{
			SKU: sku,
			Qty: item.Qty,
		})
	}

	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey != "" {
		existingOrder, err := s.orderRepo.GetOrderByIdempotencyKey(idempotencyKey)
		if err == nil && existingOrder != nil {
			return existingOrder, nil
		}
	}

	sort.Slice(cleanItems, func(i, j int) bool {
		return cleanItems[i].SKU < cleanItems[j].SKU
	})
	var createdOrder *models.SalesOrder
	err := s.orderRepo.GetDB().Transaction(func(tx *gorm.DB) error {
		type lockedProductInfo struct {
			product *models.Product
			reqQty  int
		}

		lockedProducts := make([]lockedProductInfo, 0, len(cleanItems))
		orderTotal := 0
		for _, item := range cleanItems {
			product, err := s.productRepo.GetProductBySKUWithLock(tx, item.SKU)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return dto.NewAppError(http.StatusBadRequest, "UNKNOWN_SKU", fmt.Sprintf("Unknown SKU: %s", item.SKU))
				}
				return err
			}

			if !product.IsActive {
				return dto.NewAppError(http.StatusBadRequest, "INACTIVE_PRODUCT", fmt.Sprintf("Product %s is inactive", item.SKU))
			}

			if product.Stock < item.Qty {
				return dto.NewAppError(
					http.StatusConflict,
					"INSUFFICIENT_STOCK",
					fmt.Sprintf("Insufficient stock for SKU %s: %d available", item.SKU, product.Stock),
				).WithAvailable(product.Stock).WithSKU(item.SKU)
			}

			orderTotal += product.Price * item.Qty
			lockedProducts = append(lockedProducts, lockedProductInfo{
				product: product,
				reqQty:  item.Qty,
			})
		}
		var idempPtr *string
		if idempotencyKey != "" {
			idempPtr = &idempotencyKey
		}

		order := models.SalesOrder{
			Customer:       customer,
			Status:         "CREATED",
			Total:          orderTotal,
			CreatedAt:      time.Now(),
			IdempotencyKey: idempPtr,
		}

		if err := s.orderRepo.CreateOrder(tx, &order); err != nil {
			return err
		}

		orderItems := make([]models.SalesOrderItem, 0, len(lockedProducts))

		for _, item := range lockedProducts {
			newStock := item.product.Stock - item.reqQty
			if err := s.productRepo.UpdateStock(tx, item.product.ID, newStock); err != nil {
				return err
			}
			movement := models.StockMovement{
				ProductID: item.product.ID,
				Type:      "out",
				Qty:       item.reqQty,
				Note:      fmt.Sprintf("Order #%d", order.ID),
				CreatedAt: time.Now(),
			}
			if err := s.productRepo.CreateMovement(tx, &movement); err != nil {
				return err
			}

			orderItem := models.SalesOrderItem{
				OrderID:   order.ID,
				ProductID: item.product.ID,
				SKU:       item.product.SKU,
				Qty:       item.reqQty,
				UnitPrice: item.product.Price,
			}
			if err := tx.Create(&orderItem).Error; err != nil {
				return err
			}
			orderItem.Product = item.product
			orderItems = append(orderItems, orderItem)
		}

		order.Items = orderItems
		createdOrder = &order
		return nil
	})

	if err != nil {
		var appErr *dto.AppError
		if errors.As(err, &appErr) {
			return nil, appErr
		}
		return nil, dto.InternalError(err)
	}

	return createdOrder, nil
}

func (s *OrderService) GetOrderByID(id int64) (*models.SalesOrder, error) {
	order, err := s.orderRepo.GetOrderByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrderNotFound
		}
		return nil, dto.InternalError(err)
	}
	return order, nil
}

func (s *OrderService) CancelOrder(id int64) (*models.SalesOrder, error) {
	var cancelledOrder *models.SalesOrder

	err := s.orderRepo.GetDB().Transaction(func(tx *gorm.DB) error {
		// Lock the order row
		order, err := s.orderRepo.GetOrderWithLock(tx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOrderNotFound
			}
			return err
		}

		if order.Status == "CANCELLED" {
			return ErrOrderCancelled
		}
		items := order.Items
		sort.Slice(items, func(i, j int) bool {
			return items[i].SKU < items[j].SKU
		})

		now := time.Now()
		for _, item := range items {
			product, err := s.productRepo.GetProductBySKUWithLock(tx, item.SKU)
			if err != nil {
				return err
			}

			newStock := product.Stock + item.Qty
			if err := s.productRepo.UpdateStock(tx, product.ID, newStock); err != nil {
				return err
			}
			movement := models.StockMovement{
				ProductID: product.ID,
				Type:      "in",
				Qty:       item.Qty,
				Note:      fmt.Sprintf("Cancelled Order #%d", order.ID),
				CreatedAt: now,
			}
			if err := s.productRepo.CreateMovement(tx, &movement); err != nil {
				return err
			}
		}
		if err := s.orderRepo.UpdateOrderStatus(tx, order.ID, "CANCELLED", now); err != nil {
			return err
		}

		order.Status = "CANCELLED"
		order.CancelledAt = &now
		cancelledOrder = order
		return nil
	})

	if err != nil {
		var appErr *dto.AppError
		if errors.As(err, &appErr) {
			return nil, appErr
		}
		return nil, dto.InternalError(err)
	}

	return cancelledOrder, nil
}

func (s *OrderService) ListOrders(req dto.ListOrdersRequest) (dto.PaginatedResponse[models.SalesOrder], error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}

	orders, total, err := s.orderRepo.ListOrders(req.Search, req.Status, req.Page, req.Limit)
	if err != nil {
		return dto.PaginatedResponse[models.SalesOrder]{}, dto.InternalError(err)
	}

	return dto.NewPaginatedResponse(orders, req.Page, req.Limit, total), nil
}

func (s *OrderService) GetSummary() (dto.SummaryResponse, error) {
	summary, err := s.orderRepo.GetSummary()
	if err != nil {
		return summary, dto.InternalError(err)
	}
	return summary, nil
}

func (s *OrderService) GetDailySalesReport(date string) (dto.DailySalesReportResponse, error) {
	report, err := s.orderRepo.GetDailySalesReport(date)
	if err != nil {
		return report, dto.InternalError(err)
	}
	return report, nil
}
