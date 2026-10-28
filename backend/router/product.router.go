package router

import (
	"ansarfadillah.tech/stkflw/handlers"
	"github.com/gin-gonic/gin"
)

func ProductRouter(router *gin.RouterGroup, handler *handlers.ProductHandler) {
	products := router.Group("/products")
	{
		products.GET("", handler.ListProducts)
		products.POST("", handler.CreateProduct)
		products.PUT("/:id", handler.UpdateProduct)
		products.DELETE("/:id", handler.DeleteProduct)
		products.POST("/:id/stock", handler.AdjustStock)
		products.GET("/:id/movements", handler.GetMovements)
	}
}
