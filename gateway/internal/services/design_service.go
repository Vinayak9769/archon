package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"archon/gateway/internal/aiclient"
	"archon/gateway/internal/db"
	"archon/gateway/internal/models"
)

var (
	ErrDesignNotFound = errors.New("design not found")
)

type DesignService struct {
	postgres *db.PostgresDB
	ai       *aiclient.Client
}

func NewDesignService(postgres *db.PostgresDB, ai *aiclient.Client) *DesignService {
	return &DesignService{
		postgres: postgres,
		ai:       ai,
	}
}

func (s *DesignService) CreateDesign(ctx context.Context, projectID, prd, provider, model string) (*models.Design, error) {
	result, err := s.ai.StartWorkflow(ctx, prd, provider, model)
	if err != nil {
		return nil, fmt.Errorf("failed to start AI workflow: %w", err)
	}

	designID := generateUUID()
	now := time.Now()

	var modelPtr *string
	if model != "" {
		modelPtr = &model
	}

	_, err = s.postgres.DB.ExecContext(ctx,
		`INSERT INTO designs (id, project_id, thread_id, status, prd, provider, model, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		designID, projectID, result.ThreadID, result.Status, prd, provider, modelPtr, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to persist design record: %w", err)
	}

	return &models.Design{
		ID:        designID,
		ProjectID: projectID,
		ThreadID:  result.ThreadID,
		Status:    sanitizeStatus(result.Status),
		PRD:       prd,
		Provider:  provider,
		Model:     modelPtr,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func (s *DesignService) GetDesign(ctx context.Context, id string) (*models.Design, error) {
	d := &models.Design{}
	err := s.postgres.DB.QueryRowContext(ctx,
		`SELECT id, project_id, thread_id, status, prd, provider, model,
		        project_model, architecture_model, database_model, openapi_model, backlog_model,
		        requirements_doc, created_at, updated_at
		 FROM designs WHERE id = $1`, id,
	).Scan(
		&d.ID, &d.ProjectID, &d.ThreadID, &d.Status, &d.PRD, &d.Provider, &d.Model,
		&d.ProjectModel, &d.ArchitectureModel, &d.DatabaseModel, &d.OpenAPIModel, &d.BacklogModel,
		&d.RequirementsDoc, &d.CreatedAt, &d.UpdatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrDesignNotFound
	} else if err != nil {
		return nil, fmt.Errorf("failed to query design: %w", err)
	}

	d.Status = sanitizeStatus(d.Status)
	return d, nil
}

func (s *DesignService) ListDesigns(ctx context.Context, projectID string) ([]*models.Design, error) {
	rows, err := s.postgres.DB.QueryContext(ctx,
		`SELECT id, project_id, thread_id, status, prd, provider, model,
		        project_model, architecture_model, database_model, openapi_model, backlog_model,
		        requirements_doc, created_at, updated_at
		 FROM designs WHERE project_id = $1 ORDER BY created_at DESC`, projectID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query designs: %w", err)
	}
	defer rows.Close()

	var list []*models.Design
	for rows.Next() {
		d := &models.Design{}
		err := rows.Scan(
			&d.ID, &d.ProjectID, &d.ThreadID, &d.Status, &d.PRD, &d.Provider, &d.Model,
			&d.ProjectModel, &d.ArchitectureModel, &d.DatabaseModel, &d.OpenAPIModel, &d.BacklogModel,
			&d.RequirementsDoc, &d.CreatedAt, &d.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan design row: %w", err)
		}
		d.Status = sanitizeStatus(d.Status)
		list = append(list, d)
	}

	return list, nil
}

func (s *DesignService) ResumeDesign(ctx context.Context, designID, action, payload string) (*models.Design, error) {
	d, err := s.GetDesign(ctx, designID)
	if err != nil {
		return nil, err
	}

	result, err := s.ai.ResumeWorkflow(ctx, d.ThreadID, action, payload)
	if err != nil {
		return nil, fmt.Errorf("failed to resume AI workflow: %w", err)
	}

	d, err = s.SyncDesignState(ctx, designID)
	if err != nil {
		_, _ = s.postgres.DB.ExecContext(ctx,
			`UPDATE designs SET status = $1, updated_at = $2 WHERE id = $3`,
			result.Status, time.Now(), designID,
		)
		d.Status = result.Status
	}

	return d, nil
}

func (s *DesignService) SyncDesignState(ctx context.Context, designID string) (*models.Design, error) {
	d, err := s.GetDesign(ctx, designID)
	if err != nil {
		return nil, err
	}

	state, err := s.ai.GetWorkflowState(ctx, d.ThreadID)
	if err != nil {
		log.Printf("Warning: failed to sync design state from AI service: %v. Using cached database state.", err)
		return d, nil
	}

	now := time.Now()
	_, err = s.postgres.DB.ExecContext(ctx,
		`UPDATE designs SET
			status = $1,
			project_model = CASE WHEN $2 = '' THEN project_model ELSE $2::jsonb END,
			architecture_model = CASE WHEN $3 = '' THEN architecture_model ELSE $3::jsonb END,
			database_model = CASE WHEN $4 = '' THEN database_model ELSE $4::jsonb END,
			openapi_model = CASE WHEN $5 = '' THEN openapi_model ELSE $5::jsonb END,
			requirements_doc = CASE WHEN $6 = '' THEN requirements_doc ELSE $6 END,
			backlog_model = CASE WHEN $7 = '' THEN backlog_model ELSE $7::jsonb END,
			updated_at = $8
		 WHERE id = $9`,
		sanitizeStatus(state.Status),
		state.ProjectModel,
		state.ArchitectureModel,
		state.DatabaseModel,
		state.OpenAPIModel,
		state.RequirementsDoc,
		state.BacklogModel,
		now,
		designID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to sync design state: %w", err)
	}

	d, err = s.GetDesign(ctx, designID)
	if err != nil {
		return nil, err
	}

	if state.InterruptType != "" {
		d.InterruptType = &state.InterruptType
		d.InterruptPayload = &state.InterruptPayload
	}

	return d, nil
}

func sanitizeStatus(status string) string {
	cleaned := strings.TrimPrefix(status, "WorkflowStatus.")
	return strings.ToLower(cleaned)
}

func (s *DesignService) GenerateBacklog(ctx context.Context, designID, feedback string) (*models.Design, error) {
	d, err := s.GetDesign(ctx, designID)
	if err != nil {
		return nil, err
	}

	result, err := s.ai.GenerateBacklog(ctx, d.ThreadID, feedback)
	if err != nil {
		return nil, fmt.Errorf("failed to generate backlog: %w", err)
	}

	now := time.Now()
	_, err = s.postgres.DB.ExecContext(ctx,
		`UPDATE designs SET backlog_model = $1::jsonb, updated_at = $2 WHERE id = $3`,
		result.BacklogModel, now, designID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to persist backlog: %w", err)
	}

	d.BacklogModel = &result.BacklogModel
	d.UpdatedAt = now
	return d, nil
}
