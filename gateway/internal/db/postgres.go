package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)


type PostgresDB struct {
	DB *sql.DB
}

func ConnectPostgres(databaseURL string) (*PostgresDB, error) {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	pg := &PostgresDB{DB: db}

	if err := pg.RunMigrations(); err != nil {
		db.Close()
		return nil, fmt.Errorf("database schema migrations failed: %w", err)
	}

	return pg, nil
}

func (p *PostgresDB) Close() error {
	if p.DB != nil {
		return p.DB.Close()
	}
	return nil
}

func (p *PostgresDB) RunMigrations() error {
	queries := []string{
		// Users Table
		`CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(255) PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,

		// Projects Table
		`CREATE TABLE IF NOT EXISTS projects (
			id VARCHAR(255) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			repo_url VARCHAR(255) NOT NULL,
			branch VARCHAR(255) NOT NULL,
			owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,

		// Designs Table — tracks AI system-design workflow executions
		`CREATE TABLE IF NOT EXISTS designs (
			id VARCHAR(255) PRIMARY KEY,
			project_id VARCHAR(255) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
			thread_id VARCHAR(255) NOT NULL UNIQUE,
			status VARCHAR(100) NOT NULL DEFAULT 'validating',
			prd TEXT NOT NULL,
			provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
			model VARCHAR(100),
			project_model JSONB,
			architecture_model JSONB,
			database_model JSONB,
			openapi_model JSONB,
			requirements_doc TEXT,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,

		// Add backlog_model column if it doesn't exist
		`DO $$ BEGIN
			ALTER TABLE designs ADD COLUMN IF NOT EXISTS backlog_model JSONB;
		EXCEPTION WHEN duplicate_column THEN NULL;
		END $$;`,

		// Workspaces table
		`CREATE TABLE IF NOT EXISTS workspaces (
			id         VARCHAR(255) PRIMARY KEY,
			name       VARCHAR(255) NOT NULL,
			owner_id   VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,

		// Workspace members (owner is also recorded here)
		`CREATE TABLE IF NOT EXISTS workspace_members (
			workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
			user_id      VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			role         VARCHAR(50)  NOT NULL DEFAULT 'member',
			joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (workspace_id, user_id)
		);`,

		// Add workspace_id to projects (nullable for backfill)
		`DO $$ BEGIN
			ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255)
				REFERENCES workspaces(id) ON DELETE CASCADE;
		EXCEPTION WHEN duplicate_column THEN NULL;
		END $$;`,

		// Task assignments — one assignee per task slot (upsert by unique key)
		`CREATE TABLE IF NOT EXISTS task_assignments (
			id          VARCHAR(255) PRIMARY KEY,
			design_id   VARCHAR(255) NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
			epic_name   TEXT NOT NULL,
			story_name  TEXT NOT NULL,
			task_title  TEXT NOT NULL,
			assignee_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			assigned_by VARCHAR(255) NOT NULL REFERENCES users(id),
			status      VARCHAR(50) NOT NULL DEFAULT 'todo',
			created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (design_id, epic_name, story_name, task_title)
		);`,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for idx, query := range queries {
		if _, err := p.DB.ExecContext(ctx, query); err != nil {
			return fmt.Errorf("failed executing migration index %d: %w", idx, err)
		}
	}

	return nil
}
