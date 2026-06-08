package services

import (
	"context"
	"log"
	"os"
	"testing"

	"archon/gateway/internal/db"
)

var testDB *db.PostgresDB

func TestMain(m *testing.M) {
	// 1. Get test database URL (default to local test DB)
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:vinayak123@localhost:5432/archon_test?sslmode=disable"
	}

	// 2. Connect and run migrations
	var err error
	testDB, err = db.ConnectPostgres(dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}
	defer testDB.Close()

	// 3. Run all tests
	code := m.Run()

	os.Exit(code)
}

// clearDatabase truncates all tables to ensure clean, isolated tests
func clearDatabase(t *testing.T) {
	t.Helper()
	tables := []string{
		"task_assignments",
		"designs",
		"projects",
		"workspace_members",
		"workspaces",
		"users",
	}

	ctx := context.Background()
	for _, table := range tables {
		_, err := testDB.DB.ExecContext(ctx, "TRUNCATE TABLE "+table+" RESTART IDENTITY CASCADE;")
		if err != nil {
			t.Fatalf("failed to truncate table %s: %v", table, err)
		}
	}
}
