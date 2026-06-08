package models

import "time"

// User holds authorization details
type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

// Workspace is the top-level multi-user container
type Workspace struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	OwnerID   string    `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

// WorkspaceMember links a user to a workspace with a role
type WorkspaceMember struct {
	WorkspaceID string    `json:"workspace_id"`
	UserID      string    `json:"user_id"`
	Email       string    `json:"email"`
	Role        string    `json:"role"` // "owner" | "member"
	JoinedAt    time.Time `json:"joined_at"`
}

// Project represents a product to design, scoped to a workspace
type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	RepoURL     string    `json:"repo_url"`
	Branch      string    `json:"branch"`
	OwnerID     string    `json:"owner_id"`
	WorkspaceID *string   `json:"workspace_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// Design tracks a system-design workflow execution backed by the AI service
type Design struct {
	ID                string     `json:"id"`
	ProjectID         string     `json:"project_id"`
	ThreadID          string     `json:"thread_id"`
	Status            string     `json:"status"`
	PRD               string     `json:"prd"`
	Provider          string     `json:"provider"`
	Model             *string    `json:"model,omitempty"`
	ProjectModel      *string    `json:"project_model,omitempty"`
	ArchitectureModel *string    `json:"architecture_model,omitempty"`
	DatabaseModel     *string    `json:"database_model,omitempty"`
	OpenAPIModel      *string    `json:"openapi_model,omitempty"`
	BacklogModel      *string    `json:"backlog_model,omitempty"`
	RequirementsDoc   *string    `json:"requirements_doc,omitempty"`
	InterruptType     *string    `json:"interrupt_type,omitempty"`
	InterruptPayload  *string    `json:"interrupt_payload,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// TaskAssignment records a task being assigned to a workspace member
type TaskAssignment struct {
	ID            string    `json:"id"`
	DesignID      string    `json:"design_id"`
	EpicName      string    `json:"epic_name"`
	StoryName     string    `json:"story_name"`
	TaskTitle     string    `json:"task_title"`
	AssigneeID    string    `json:"assignee_id"`
	AssigneeEmail string    `json:"assignee_email"`
	AssignedBy    string    `json:"assigned_by"`
	Status        string    `json:"status"` // "todo" | "in_progress" | "done"
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	// Enrichment for My Tasks view
	ProjectID     string `json:"project_id,omitempty"`
	ProjectName   string `json:"project_name,omitempty"`
	WorkspaceName string `json:"workspace_name,omitempty"`
}
