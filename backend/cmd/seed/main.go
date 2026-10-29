package main

import (
	"log"

	"ansarfadillah.tech/stkflw/database"
	"ansarfadillah.tech/stkflw/internal/config"
)

func main() {
	cfg := config.NewConfig()
	if cfg.Database.URL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	db := database.Connect(cfg.Database.URL)
	if err := database.Migrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	if err := database.Seed(db); err != nil {
		log.Fatalf("failed to seed database: %v", err)
	}

	log.Println("Database seeded successfully")
}
