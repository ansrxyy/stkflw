package config

import (
	"bufio"
	"os"
	"strings"
)

type DatabaseConfig struct {
	URL string `json:"url"`
}

type DatabseConfig = DatabaseConfig

type Config struct {
	Database DatabaseConfig `json:"database"`
}

func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			if _, exists := os.LookupEnv(key); !exists {
				os.Setenv(key, val)
			}
		}
	}
}

func NewConfig() Config {
	loadEnv()
	return Config{
		Database: DatabaseConfig{
			URL: getConfig("DATABASE_URL", ""),
		},
	}
}

func getConfig(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
