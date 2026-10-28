package router

import (
	"github.com/gin-gonic/gin"
)

func SetupRouter(r *gin.Engine) *gin.RouterGroup {
	// Base /api endpoint

	// Grouping the API routes under /api
	api := r.Group("/api")
	// Middleware for authentication can be added here if needed
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	return api
}
