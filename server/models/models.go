package models

import "gorm.io/gorm"

type Database struct {
	db *gorm.DB
}
