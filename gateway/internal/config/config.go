package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all config properties loaded from system environment variables
type Config struct {
	Port         string
	DatabaseURL  string
	RedisURL     string
	JWTSecret    string
	AIServiceURL string
}

// LoadConfig retrieves configuration settings, falling back to sensible defaults if environment variables are not populated.
func LoadConfig() *Config {
	// Load environment variables from .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("Info: No .env file found or failed to load (using system environment variables)")
	}
	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://postgres:vinayak123@localhost:5432/archon?sslmode=disable")
	redisURL := getEnv("REDIS_URL", "redis://localhost:6379/0")
	jwtSecret := getEnv("JWT_SECRET", "archon-gateway-super-secret-key-123456")
	aiServiceURL := getEnv("AI_SERVICE_URL", "localhost:50051")

	return &Config{
		Port:         port,
		DatabaseURL:  dbURL,
		RedisURL:     redisURL,
		JWTSecret:    jwtSecret,
		AIServiceURL: aiServiceURL,
	}
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
