package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"archon/gateway/internal/db"
	"archon/gateway/internal/models"
)

var (
	ErrProjectNotFound = errors.New("project not found")
)

type ProjectService struct {
	postgres *db.PostgresDB
}

func NewProjectService(postgres *db.PostgresDB) *ProjectService {
	return &ProjectService{
		postgres: postgres,
	}
}

// CreateProject registers a new project inside a workspace.
func (s *ProjectService) CreateProject(ctx context.Context, name, repoURL, branch, ownerID, workspaceID string) (*models.Project, error) {
	projectID := generateUUID()
	now := time.Now()

	_, err := s.postgres.DB.ExecContext(ctx,
		"INSERT INTO projects (id, name, repo_url, branch, owner_id, workspace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		projectID, name, repoURL, branch, ownerID, workspaceID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save project: %w", err)
	}

	return &models.Project{
		ID:          projectID,
		Name:        name,
		RepoURL:     repoURL,
		Branch:      branch,
		OwnerID:     ownerID,
		WorkspaceID: &workspaceID,
		CreatedAt:   now,
	}, nil
}

// ListProjects retrieves all projects in a workspace visible to the requester.
func (s *ProjectService) ListProjects(ctx context.Context, workspaceID, requesterID string) ([]*models.Project, error) {
	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT p.id, p.name, p.repo_url, p.branch, p.owner_id, p.workspace_id, p.created_at
		FROM projects p
		JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
		WHERE p.workspace_id = $1
		ORDER BY p.created_at DESC
	`, workspaceID, requesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to query projects: %w", err)
	}
	defer rows.Close()

	var list []*models.Project
	for rows.Next() {
		p := &models.Project{}
		err := rows.Scan(&p.ID, &p.Name, &p.RepoURL, &p.Branch, &p.OwnerID, &p.WorkspaceID, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}
		list = append(list, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration: %w", err)
	}

	return list, nil
}

// ListProjectsByOwner retrieves all projects owned by a user (fallback / personal view).
func (s *ProjectService) ListProjectsByOwner(ctx context.Context, ownerID string) ([]*models.Project, error) {
	rows, err := s.postgres.DB.QueryContext(ctx,
		"SELECT id, name, repo_url, branch, owner_id, workspace_id, created_at FROM projects WHERE owner_id = $1 ORDER BY created_at DESC",
		ownerID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query user projects: %w", err)
	}
	defer rows.Close()

	var list []*models.Project
	for rows.Next() {
		p := &models.Project{}
		err := rows.Scan(&p.ID, &p.Name, &p.RepoURL, &p.Branch, &p.OwnerID, &p.WorkspaceID, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project row: %w", err)
		}
		list = append(list, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during rows iteration: %w", err)
	}

	return list, nil
}

// GetProjectByID retrieves a specific project. Any workspace member may view it.
func (s *ProjectService) GetProjectByID(ctx context.Context, id, requesterID string) (*models.Project, error) {
	p := &models.Project{}
	err := s.postgres.DB.QueryRowContext(ctx, `
		SELECT p.id, p.name, p.repo_url, p.branch, p.owner_id, p.workspace_id, p.created_at
		FROM projects p
		LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
		WHERE p.id = $1 AND (p.owner_id = $2 OR wm.user_id IS NOT NULL)
	`, id, requesterID).Scan(&p.ID, &p.Name, &p.RepoURL, &p.Branch, &p.OwnerID, &p.WorkspaceID, &p.CreatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrProjectNotFound
	} else if err != nil {
		return nil, fmt.Errorf("failed to query single project: %w", err)
	}

	return p, nil
}

// DeleteProject removes a project and all its designs. Only the owner may delete.
func (s *ProjectService) DeleteProject(ctx context.Context, projectID, requesterID string) error {
	result, err := s.postgres.DB.ExecContext(ctx,
		"DELETE FROM projects WHERE id = $1 AND owner_id = $2",
		projectID, requesterID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if n == 0 {
		return ErrProjectNotFound
	}
	return nil
}

func (s *ProjectService) UpdateProject(ctx context.Context, id, requesterID, repoURL, branch string) (*models.Project, error) {
	p, err := s.GetProjectByID(ctx, id, requesterID)
	if err != nil {
		return nil, err
	}

	_, err = s.postgres.DB.ExecContext(ctx, `
		UPDATE projects
		SET repo_url = $1, branch = $2
		WHERE id = $3
	`, repoURL, branch, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	p.RepoURL = repoURL
	p.Branch = branch
	return p, nil
}

