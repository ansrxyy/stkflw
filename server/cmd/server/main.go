package main

import (
	"log"

	"ansarfadillah.tech/stkflw/database"
	"ansarfadillah.tech/stkflw/handlers"
	"ansarfadillah.tech/stkflw/internal/config"
	"ansarfadillah.tech/stkflw/repository"
	"ansarfadillah.tech/stkflw/router"
	"ansarfadillah.tech/stkflw/service"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.NewConfig()
	db := database.Connect(cfg.Database.URL)
	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}
	productRepo := repository.NewProductRepo(db)
	productService := service.NewProductService(productRepo)
	productHandler := handlers.NewProductHandler(productService)
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	api := router.SetupRouter(r)

	// Router
	router.ProductRouter(api, productHandler)
	log.Println("Server is running on port 8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}

}
