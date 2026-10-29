package router

import (
	"ansarfadillah.tech/stkflw/handlers"
	"github.com/gin-gonic/gin"
)

func OrderRouter(router *gin.RouterGroup, handler *handlers.OrderHandler) {
	orders := router.Group("/orders")
	{
		orders.POST("", handler.CreateOrder)
		orders.GET("", handler.ListOrders)
		orders.GET("/:id", handler.GetOrder)
		orders.POST("/:id/cancel", handler.CancelOrder)
	}

	router.GET("/summary", handler.GetSummary)
	router.GET("/reports/daily-sales", handler.GetDailySalesReport)
}
