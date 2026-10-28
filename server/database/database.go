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
	return db.AutoMigrate(&models.Product{})
}
