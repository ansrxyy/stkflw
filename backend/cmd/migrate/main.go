package main

import (
	"log"

	"ansarfadillah.tech/stkflw/database"
	"ansarfadillah.tech/stkflw/internal/config"
)

func main() {
	log.Println("[Migration] Initializing database migrator...")
	cfg := config.NewConfig()
	if cfg.Database.URL == "" {
		log.Fatal("[Migration] DATABASE_URL is not set")
	}

	db := database.Connect(cfg.Database.URL)
	if err := database.Migrate(db); err != nil {
		log.Fatalf("[Migration] Failed to migrate database: %v", err)
	}

	log.Println("[Migration] Database migration finished.")
}
