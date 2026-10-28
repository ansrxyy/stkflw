package config

import "os"

type DatabseConfig struct {
	URL  string `json:"url"`
	Port int    `json:"port"`
}

type Config struct {
	Database DatabseConfig `json:"database"`
}

func NewConfig() Config {
	return Config{
		Database: DatabseConfig{
			URL:  getConfig("DATABASE_URL", ""),
			Port: 0,
		},
	}
}

func getConfig(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
