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
	ErrTaskAssignmentNotFound = errors.New("task assignment not found")
	ErrNotAssignee            = errors.New("only the assignee or owner can update this task")
)

type TaskService struct {
	postgres *db.PostgresDB
}

func NewTaskService(postgres *db.PostgresDB) *TaskService {
	return &TaskService{postgres: postgres}
}

func (s *TaskService) AssignTask(
	ctx context.Context,
	designID, epicName, storyName, taskTitle,
	assigneeID, assignedByID string,
) (*models.TaskAssignment, error) {
	id := generateUUID()
	now := time.Now()

	_, err := s.postgres.DB.ExecContext(ctx, `
		INSERT INTO task_assignments
			(id, design_id, epic_name, story_name, task_title, assignee_id, assigned_by, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'todo',$8,$9)
		ON CONFLICT (design_id, epic_name, story_name, task_title) DO UPDATE
		SET assignee_id = EXCLUDED.assignee_id,
		    assigned_by = EXCLUDED.assigned_by,
		    status      = 'todo',
		    updated_at  = EXCLUDED.updated_at
	`, id, designID, epicName, storyName, taskTitle, assigneeID, assignedByID, now, now)
	if err != nil {
		return nil, fmt.Errorf("failed to assign task: %w", err)
	}

	return s.getByKey(ctx, designID, epicName, storyName, taskTitle)
}

func (s *TaskService) UnassignTask(
	ctx context.Context,
	designID, epicName, storyName, taskTitle, requesterID string,
) error {
	res, err := s.postgres.DB.ExecContext(ctx, `
		DELETE FROM task_assignments
		WHERE design_id=$1 AND epic_name=$2 AND story_name=$3 AND task_title=$4
		  AND assigned_by=$5
	`, designID, epicName, storyName, taskTitle, requesterID)
	if err != nil {
		return fmt.Errorf("failed to unassign task: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrTaskAssignmentNotFound
	}
	return nil
}

func (s *TaskService) UpdateTaskStatus(
	ctx context.Context,
	designID, epicName, storyName, taskTitle,
	requesterID, status string,
) (*models.TaskAssignment, error) {
	res, err := s.postgres.DB.ExecContext(ctx, `
		UPDATE task_assignments
		SET status=$5, updated_at=$6
		WHERE design_id=$1 AND epic_name=$2 AND story_name=$3 AND task_title=$4
		  AND (assignee_id=$7 OR assigned_by=$7)
	`, designID, epicName, storyName, taskTitle, status, time.Now(), requesterID)
	if err != nil {
		return nil, fmt.Errorf("failed to update task status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return nil, ErrNotAssignee
	}
	return s.getByKey(ctx, designID, epicName, storyName, taskTitle)
}

func (s *TaskService) ListDesignTasks(ctx context.Context, designID string) ([]*models.TaskAssignment, error) {
	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT ta.id, ta.design_id, ta.epic_name, ta.story_name, ta.task_title,
		       ta.assignee_id, u.email, ta.assigned_by, ta.status, ta.created_at, ta.updated_at
		FROM task_assignments ta
		JOIN users u ON u.id = ta.assignee_id
		WHERE ta.design_id = $1
		ORDER BY ta.created_at
	`, designID)
	if err != nil {
		return nil, fmt.Errorf("failed to list design tasks: %w", err)
	}
	defer rows.Close()
	return scanAssignments(rows)
}

func (s *TaskService) ListMyTasks(ctx context.Context, userID string) ([]*models.TaskAssignment, error) {
	rows, err := s.postgres.DB.QueryContext(ctx, `
		SELECT ta.id, ta.design_id, ta.epic_name, ta.story_name, ta.task_title,
		       ta.assignee_id, u.email, ta.assigned_by, ta.status, ta.created_at, ta.updated_at,
		       p.id, p.name,
		       COALESCE(w.name, '')
		FROM task_assignments ta
		JOIN users      u  ON u.id  = ta.assignee_id
		JOIN designs    d  ON d.id  = ta.design_id
		JOIN projects   p  ON p.id  = d.project_id
		LEFT JOIN workspaces w ON w.id = p.workspace_id
		WHERE ta.assignee_id = $1
		ORDER BY ta.updated_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list my tasks: %w", err)
	}
	defer rows.Close()

	var list []*models.TaskAssignment
	for rows.Next() {
		ta := &models.TaskAssignment{}
		if err := rows.Scan(
			&ta.ID, &ta.DesignID, &ta.EpicName, &ta.StoryName, &ta.TaskTitle,
			&ta.AssigneeID, &ta.AssigneeEmail, &ta.AssignedBy, &ta.Status,
			&ta.CreatedAt, &ta.UpdatedAt,
			&ta.ProjectID, &ta.ProjectName, &ta.WorkspaceName,
		); err != nil {
			return nil, err
		}
		list = append(list, ta)
	}
	return list, rows.Err()
}

func (s *TaskService) getByKey(ctx context.Context, designID, epicName, storyName, taskTitle string) (*models.TaskAssignment, error) {
	ta := &models.TaskAssignment{}
	err := s.postgres.DB.QueryRowContext(ctx, `
		SELECT ta.id, ta.design_id, ta.epic_name, ta.story_name, ta.task_title,
		       ta.assignee_id, u.email, ta.assigned_by, ta.status, ta.created_at, ta.updated_at
		FROM task_assignments ta
		JOIN users u ON u.id = ta.assignee_id
		WHERE ta.design_id=$1 AND ta.epic_name=$2 AND ta.story_name=$3 AND ta.task_title=$4
	`, designID, epicName, storyName, taskTitle).Scan(
		&ta.ID, &ta.DesignID, &ta.EpicName, &ta.StoryName, &ta.TaskTitle,
		&ta.AssigneeID, &ta.AssigneeEmail, &ta.AssignedBy, &ta.Status,
		&ta.CreatedAt, &ta.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrTaskAssignmentNotFound
	}
	return ta, err
}

func scanAssignments(rows *sql.Rows) ([]*models.TaskAssignment, error) {
	var list []*models.TaskAssignment
	for rows.Next() {
		ta := &models.TaskAssignment{}
		if err := rows.Scan(
			&ta.ID, &ta.DesignID, &ta.EpicName, &ta.StoryName, &ta.TaskTitle,
			&ta.AssigneeID, &ta.AssigneeEmail, &ta.AssignedBy, &ta.Status,
			&ta.CreatedAt, &ta.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, ta)
	}
	return list, rows.Err()
}
