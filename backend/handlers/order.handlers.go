package handlers

import (
	"net/http"
	"strconv"

	"ansarfadillah.tech/stkflw/dto"
	"ansarfadillah.tech/stkflw/service"
	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	orderService service.IOrderService
}

func NewOrderHandler(orderService service.IOrderService) *OrderHandler {
	return &OrderHandler{
		orderService: orderService,
	}
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	var req dto.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_JSON", err.Error()))
		return
	}

	idempotencyKey := c.GetHeader("Idempotency-Key")

	order, err := h.orderService.CreateOrder(req, idempotencyKey)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, order)
}

func (h *OrderHandler) GetOrder(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid order ID"))
		return
	}

	order, err := h.orderService.GetOrderByID(id)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, order)
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_ID", "Invalid order ID"))
		return
	}

	order, err := h.orderService.CancelOrder(id)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.NewSuccessResponse(order, "Order cancelled successfully"))
}

func (h *OrderHandler) ListOrders(c *gin.Context) {
	var req dto.ListOrdersRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.NewErrorResponse("INVALID_QUERY", err.Error()))
		return
	}

	res, err := h.orderService.ListOrders(req)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *OrderHandler) GetSummary(c *gin.Context) {
	summary, err := h.orderService.GetSummary()
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": summary})
}

func (h *OrderHandler) GetDailySalesReport(c *gin.Context) {
	date := c.Query("date")
	report, err := h.orderService.GetDailySalesReport(date)
	if err != nil {
		HandleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": report})
}
