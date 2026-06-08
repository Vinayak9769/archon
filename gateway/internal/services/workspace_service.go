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
	ErrWorkspaceNotFound  = errors.New("workspace not found")
	ErrNotWorkspaceOwner  = errors.New("only the workspace owner can perform this action")
	ErrNotWorkspaceMember = errors.New("you are not a member of this workspace")
	ErrMemberNotFound     = errors.New("member not found in workspace")
	ErrUserNotFound       = errors.New("user not found")
	ErrAlreadyMember      = errors.New("user is already a member of this workspace")
)

type WorkspaceService struct {
	postgres *db.PostgresDB
}

func NewWorkspaceService(postgres *db.PostgresDB) *WorkspaceService {
	return &WorkspaceService{postgres: postgres}
}

// CreateWorkspace creates a new workspace and adds the creator as owner member.
func (s *WorkspaceService) CreateWorkspace(ctx context.Context, name, ownerID string) (*models.Workspace, error) {
	id := generateUUID()
	now := time.Now()

	tx, err := s.postgres.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		"INSERT INTO workspaces (id, name, owner_id, created_at) VALUES ($1, $2, $3, $4)",
		id, name, ownerID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert workspace: %w", err)
	}

	_, err = tx.ExecContext(ctx,
		"INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, 'owner', $3)",
		id, ownerID, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert owner member: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit: %w", err)
	}

	return &models.Workspace{ID: id, Name: name, OwnerID: ownerID, CreatedAt: now}, nil
}

// ListWorkspaces returns all workspaces where the user is a member (any role).
func (s *WorkspaceService) ListWorkspaces(ctx context.Context, userID string) ([]*models.Workspace, error) {
	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT w.id, w.name, w.owner_id, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query workspaces: %w", err)
	}
	defer rows.Close()

	var list []*models.Workspace
	for rows.Next() {
		w := &models.Workspace{}
		if err := rows.Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, w)
	}
	return list, rows.Err()
}

// GetWorkspace returns a workspace if the requester is a member.
func (s *WorkspaceService) GetWorkspace(ctx context.Context, id, requesterID string) (*models.Workspace, error) {
	w := &models.Workspace{}
	err := s.postgres.DB.QueryRowContext(ctx, `
		SELECT w.id, w.name, w.owner_id, w.created_at
		FROM workspaces w
		JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $2
		WHERE w.id = $1
	`, id, requesterID).Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrWorkspaceNotFound
	}
	return w, err
}

// AddMember adds a registered user (by email) to a workspace. Only owners may do this.
func (s *WorkspaceService) AddMember(ctx context.Context, workspaceID, ownerID, memberEmail string) (*models.WorkspaceMember, error) {
	if ok, err := s.IsOwner(ctx, workspaceID, ownerID); err != nil || !ok {
		return nil, ErrNotWorkspaceOwner
	}

	// Resolve user by email
	var memberID string
	err := s.postgres.DB.QueryRowContext(ctx,
		"SELECT id FROM users WHERE email = $1", memberEmail,
	).Scan(&memberID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to lookup user: %w", err)
	}

	now := time.Now()
	_, err = s.postgres.DB.ExecContext(ctx,
		"INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES ($1, $2, 'member', $3)",
		workspaceID, memberID, now,
	)
	if err != nil {
		// Check for unique constraint violation
		return nil, ErrAlreadyMember
	}

	return &models.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Email:       memberEmail,
		Role:        "member",
		JoinedAt:    now,
	}, nil
}

// RemoveMember removes a member from a workspace. Only owners may do this.
func (s *WorkspaceService) RemoveMember(ctx context.Context, workspaceID, ownerID, memberUserID string) error {
	if ok, err := s.IsOwner(ctx, workspaceID, ownerID); err != nil || !ok {
		return ErrNotWorkspaceOwner
	}
	if memberUserID == ownerID {
		return errors.New("owner cannot remove themselves")
	}

	res, err := s.postgres.DB.ExecContext(ctx,
		"DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
		workspaceID, memberUserID,
	)
	if err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrMemberNotFound
	}
	return nil
}

// ListMembers returns all members of a workspace (requester must be a member).
func (s *WorkspaceService) ListMembers(ctx context.Context, workspaceID, requesterID string) ([]*models.WorkspaceMember, error) {
	if ok, _ := s.IsMember(ctx, workspaceID, requesterID); !ok {
		return nil, ErrNotWorkspaceMember
	}

	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT wm.workspace_id, wm.user_id, u.email, wm.role, wm.joined_at
		FROM workspace_members wm
		JOIN users u ON u.id = wm.user_id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at ASC
	`, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to list members: %w", err)
	}
	defer rows.Close()

	var list []*models.WorkspaceMember
	for rows.Next() {
		m := &models.WorkspaceMember{}
		if err := rows.Scan(&m.WorkspaceID, &m.UserID, &m.Email, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	return list, rows.Err()
}

// IsMember returns true if the user belongs to the workspace.
func (s *WorkspaceService) IsMember(ctx context.Context, workspaceID, userID string) (bool, error) {
	var exists bool
	err := s.postgres.DB.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2)",
		workspaceID, userID,
	).Scan(&exists)
	return exists, err
}

// IsOwner returns true if the user is the owner of the workspace.
func (s *WorkspaceService) IsOwner(ctx context.Context, workspaceID, userID string) (bool, error) {
	var exists bool
	err := s.postgres.DB.QueryRowContext(ctx,
		"SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role='owner')",
		workspaceID, userID,
	).Scan(&exists)
	return exists, err
}

// BackfillPersonalWorkspaces creates personal workspaces for users with orphan projects.
func (s *WorkspaceService) BackfillPersonalWorkspaces(ctx context.Context) error {
	// Find users who own projects with no workspace_id
	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT DISTINCT u.id, u.email
		FROM users u
		JOIN projects p ON p.owner_id = u.id
		WHERE p.workspace_id IS NULL
	`)
	if err != nil {
		return fmt.Errorf("backfill query failed: %w", err)
	}
	defer rows.Close()

	type userRow struct{ id, email string }
	var users []userRow
	for rows.Next() {
		var u userRow
		if err := rows.Scan(&u.id, &u.email); err != nil {
			return err
		}
		users = append(users, u)
	}
	rows.Close()

	for _, u := range users {
		ws, err := s.CreateWorkspace(ctx, "Personal Workspace", u.id)
		if err != nil {
			return fmt.Errorf("failed to create personal workspace for %s: %w", u.email, err)
		}
		_, err = s.postgres.DB.ExecContext(ctx,
			"UPDATE projects SET workspace_id = $1 WHERE owner_id = $2 AND workspace_id IS NULL",
			ws.ID, u.id,
		)
		if err != nil {
			return fmt.Errorf("failed to backfill projects for %s: %w", u.email, err)
		}
	}
	return nil
}
