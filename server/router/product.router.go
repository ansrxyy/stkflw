package router

import (
	"ansarfadillah.tech/stkflw/handlers"
	"github.com/gin-gonic/gin"
)

func ProductRouter(router *gin.RouterGroup, handler *handlers.ProductHandler) {
	router.GET("/products", func(c *gin.Context) {
		products, err := handler.ListProducts()
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, products)
	})
}
