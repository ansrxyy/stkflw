package database

import (
	"log"

	"ansarfadillah.tech/stkflw/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(dsn string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal("failed to connect database: ", err)
	}
	return db
}

func Migrate(db *gorm.DB) error {
	allModels := models.AllModels()
	log.Printf("[Migration] Running auto migration for %d model(s)...", len(allModels))

	migratorDB := db.Session(&gorm.Session{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err := migratorDB.AutoMigrate(allModels...); err != nil {
		log.Printf("[Migration] Auto migration failed: %v", err)
		return err
	}

	log.Println("[Migration] Auto migration completed successfully")
	return nil
}
