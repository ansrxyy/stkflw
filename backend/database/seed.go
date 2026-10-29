package database

import (
	"fmt"
	"log"
	"time"

	"ansarfadillah.tech/stkflw/models"
	"gorm.io/gorm"
)

func SeedIfEmpty(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Product{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	return Seed(db)
}

func Seed(db *gorm.DB) error {
	log.Println("[Seed] Seeding database with initial data...")

	return db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()

		type seedItem struct {
			SKU      string
			Name     string
			Price    int
			Stock    int
			IsActive bool
			HasMvmt  bool
		}

		productsData := []seedItem{
			{SKU: "ELEC-LOGI-MXM3", Name: "Logitech MX Master 3S Wireless Mouse", Price: 1550000, Stock: 25, IsActive: true, HasMvmt: true},
			{SKU: "ELEC-KEYCH-K2V2", Name: "Keychron K2 V2 Mechanical Keyboard", Price: 1299000, Stock: 15, IsActive: true, HasMvmt: true},
			{SKU: "DISP-DELL-U2723", Name: "Dell UltraSharp 27 4K USB-C Monitor", Price: 8450000, Stock: 8, IsActive: true, HasMvmt: true},
			{SKU: "AUD-SONY-WH1000", Name: "Sony WH-1000XM5 Noise-Canceling Headphones", Price: 4999000, Stock: 12, IsActive: true, HasMvmt: true},
			{SKU: "OFF-HERM-AER01", Name: "Herman Miller Aeron Ergonomic Chair", Price: 18500000, Stock: 4, IsActive: true, HasMvmt: true},
			{SKU: "ELEC-APPL-M3PRO", Name: "Apple MacBook Pro 14 M3 Pro", Price: 31999000, Stock: 6, IsActive: true, HasMvmt: true},
			{SKU: "ACC-ANKR-737PB", Name: "Anker 737 Power Bank 24000mAh 140W", Price: 1850000, Stock: 30, IsActive: true, HasMvmt: true},
			{SKU: "ACC-BASE-BLADE", Name: "Baseus Blade 100W Ultra-Thin Power Bank", Price: 850000, Stock: 18, IsActive: true, HasMvmt: true},
			{SKU: "NET-UBIQ-U6PRO", Name: "Ubiquiti UniFi 6 Pro Access Point", Price: 2750000, Stock: 10, IsActive: true, HasMvmt: true},
			{SKU: "STRG-SAMS-990PR", Name: "Samsung 990 PRO NVMe SSD 2TB", Price: 2650000, Stock: 40, IsActive: true, HasMvmt: true},
			{SKU: "STRG-SAND-E612T", Name: "SanDisk Extreme Portable SSD 2TB", Price: 2350000, Stock: 20, IsActive: true, HasMvmt: true},
			{SKU: "DISP-LG-27GP850", Name: "LG UltraGear 27GP850 Gaming Monitor", Price: 4750000, Stock: 9, IsActive: true, HasMvmt: true},
			{SKU: "CBL-BELK-TB402", Name: "Belkin Thunderbolt 4 Pro Cable 2m", Price: 950000, Stock: 50, IsActive: true, HasMvmt: true},
			{SKU: "OBSO-LOGI-M185", Name: "Logitech M185 Wireless Mouse (Discontinued)", Price: 120000, Stock: 0, IsActive: false, HasMvmt: true},
			{SKU: "OBSO-DELL-E1916", Name: "Dell 18.5 Inch Monitor E1916HV (End of Life)", Price: 850000, Stock: 2, IsActive: false, HasMvmt: true},
			{SKU: "DEMO-NEW-PROD1", Name: "Demo Temporary Product (Safe to Delete)", Price: 250000, Stock: 0, IsActive: true, HasMvmt: false},
		}

		productMap := make(map[string]*models.Product)

		for _, item := range productsData {
			prod := models.Product{
				SKU:       item.SKU,
				Name:      item.Name,
				Price:     item.Price,
				Stock:     item.Stock,
				IsActive:  item.IsActive,
				CreatedAt: now.Add(-7 * 24 * time.Hour),
			}
			if err := tx.Where(models.Product{SKU: item.SKU}).FirstOrCreate(&prod).Error; err != nil {
				return err
			}
			productMap[prod.SKU] = &prod

			if item.HasMvmt {
				var mvmtCount int64
				tx.Model(&models.StockMovement{}).Where("product_id = ?", prod.ID).Count(&mvmtCount)
				if mvmtCount == 0 {
					if item.Stock > 0 {
						mvmt := models.StockMovement{
							ProductID: prod.ID,
							Type:      "in",
							Qty:       item.Stock,
							Note:      "Initial inventory balance opening",
							CreatedAt: now.Add(-5 * 24 * time.Hour),
						}
						if err := tx.Create(&mvmt).Error; err != nil {
							return err
						}
					} else {
						inMvmt := models.StockMovement{
							ProductID: prod.ID,
							Type:      "in",
							Qty:       5,
							Note:      "Initial inventory opening",
							CreatedAt: now.Add(-5 * 24 * time.Hour),
						}
						outMvmt := models.StockMovement{
							ProductID: prod.ID,
							Type:      "out",
							Qty:       5,
							Note:      "Clearance of discontinued stock",
							CreatedAt: now.Add(-2 * 24 * time.Hour),
						}
						if err := tx.Create(&inMvmt).Error; err != nil {
							return err
						}
						if err := tx.Create(&outMvmt).Error; err != nil {
							return err
						}
					}
				}
			}
		}

		var orderCount int64
		if err := tx.Model(&models.SalesOrder{}).Count(&orderCount).Error; err != nil {
			return err
		}

		if orderCount == 0 {
			order1 := models.SalesOrder{
				Customer:  "PT Teknologi Maju Bersama",
				Status:    "CREATED",
				CreatedAt: now.Add(-12 * time.Hour),
			}
			p1 := productMap["ELEC-LOGI-MXM3"]
			p2 := productMap["ELEC-KEYCH-K2V2"]
			if p1 != nil && p2 != nil {
				items1 := []models.SalesOrderItem{
					{ProductID: p1.ID, SKU: p1.SKU, Qty: 2, UnitPrice: p1.Price},
					{ProductID: p2.ID, SKU: p2.SKU, Qty: 1, UnitPrice: p2.Price},
				}
				order1.Total = (2 * p1.Price) + (1 * p2.Price)
				order1.Items = items1
				if err := tx.Create(&order1).Error; err != nil {
					return err
				}
				for _, it := range items1 {
					mv := models.StockMovement{
						ProductID: it.ProductID,
						Type:      "out",
						Qty:       it.Qty,
						Note:      fmt.Sprintf("Order fulfillment #%d", order1.ID),
						CreatedAt: order1.CreatedAt,
					}
					if err := tx.Create(&mv).Error; err != nil {
						return err
					}
				}
			}

			order2 := models.SalesOrder{
				Customer:  "CV Graha Nusantara",
				Status:    "CREATED",
				CreatedAt: now.Add(-6 * time.Hour),
			}
			p3 := productMap["DISP-DELL-U2723"]
			p4 := productMap["CBL-BELK-TB402"]
			if p3 != nil && p4 != nil {
				items2 := []models.SalesOrderItem{
					{ProductID: p3.ID, SKU: p3.SKU, Qty: 1, UnitPrice: p3.Price},
					{ProductID: p4.ID, SKU: p4.SKU, Qty: 2, UnitPrice: p4.Price},
				}
				order2.Total = (1 * p3.Price) + (2 * p4.Price)
				order2.Items = items2
				if err := tx.Create(&order2).Error; err != nil {
					return err
				}
				for _, it := range items2 {
					mv := models.StockMovement{
						ProductID: it.ProductID,
						Type:      "out",
						Qty:       it.Qty,
						Note:      fmt.Sprintf("Order fulfillment #%d", order2.ID),
						CreatedAt: order2.CreatedAt,
					}
					if err := tx.Create(&mv).Error; err != nil {
						return err
					}
				}
			}

			cancelledAt := now.Add(-2 * time.Hour)
			order3 := models.SalesOrder{
				Customer:    "Sinar Jaya Logistik",
				Status:      "CANCELLED",
				CreatedAt:   now.Add(-20 * time.Hour),
				CancelledAt: &cancelledAt,
			}
			p5 := productMap["AUD-SONY-WH1000"]
			if p5 != nil {
				items3 := []models.SalesOrderItem{
					{ProductID: p5.ID, SKU: p5.SKU, Qty: 1, UnitPrice: p5.Price},
				}
				order3.Total = 1 * p5.Price
				order3.Items = items3
				if err := tx.Create(&order3).Error; err != nil {
					return err
				}
				mvOut := models.StockMovement{
					ProductID: p5.ID,
					Type:      "out",
					Qty:       1,
					Note:      fmt.Sprintf("Order placement #%d", order3.ID),
					CreatedAt: order3.CreatedAt,
				}
				mvIn := models.StockMovement{
					ProductID: p5.ID,
					Type:      "in",
					Qty:       1,
					Note:      fmt.Sprintf("Restock from cancelled order #%d", order3.ID),
					CreatedAt: cancelledAt,
				}
				if err := tx.Create(&mvOut).Error; err != nil {
					return err
				}
				if err := tx.Create(&mvIn).Error; err != nil {
					return err
				}
			}
		}

		log.Println("[Seed] Database seeding completed successfully")
		return nil
	})
}
