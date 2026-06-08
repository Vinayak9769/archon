package services

import (
	"context"
	"testing"
	"time"
)

func TestTaskService_AssignAndManageTasks(t *testing.T) {
	clearDatabase(t)

	authService := NewAuthService(testDB, "secret")
	wsService := NewWorkspaceService(testDB)
	taskService := NewTaskService(testDB)
	ctx := context.Background()

	// 1. Setup users
	owner, err := authService.SignUp(ctx, "owner@example.com", "password")
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}
	assignee1, err := authService.SignUp(ctx, "assignee1@example.com", "password")
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}
	assignee2, err := authService.SignUp(ctx, "assignee2@example.com", "password")
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	// 2. Setup workspace, project, design
	ws, err := wsService.CreateWorkspace(ctx, "Workspace", owner.ID)
	if err != nil {
		t.Fatalf("CreateWorkspace failed: %v", err)
	}

	projectID := "project-123"
	_, err = testDB.DB.ExecContext(ctx,
		"INSERT INTO projects (id, name, repo_url, branch, owner_id, workspace_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		projectID, "Project Name", "https://github.com/foo/bar", "main", owner.ID, ws.ID, time.Now(),
	)
	if err != nil {
		t.Fatalf("Failed to insert project: %v", err)
	}

	designID := "design-123"
	_, err = testDB.DB.ExecContext(ctx,
		"INSERT INTO designs (id, project_id, thread_id, status, prd, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
		designID, projectID, "thread-abc", "completed", "PRD content", time.Now(), time.Now(),
	)
	if err != nil {
		t.Fatalf("Failed to insert design: %v", err)
	}

	epic := "Auth"
	story := "User Login"
	title := "Implement JWT auth handler"

	// 3. Test AssignTask
	ta, err := taskService.AssignTask(ctx, designID, epic, story, title, assignee1.ID, owner.ID)
	if err != nil {
		t.Fatalf("AssignTask failed: %v", err)
	}
	if ta.AssigneeID != assignee1.ID {
		t.Errorf("expected assignee ID %s, got %s", assignee1.ID, ta.AssigneeID)
	}
	if ta.AssigneeEmail != "assignee1@example.com" {
		t.Errorf("expected assignee email %s, got %s", "assignee1@example.com", ta.AssigneeEmail)
	}
	if ta.Status != "todo" {
		t.Errorf("expected initial status 'todo', got %s", ta.Status)
	}

	// 4. Test UpdateTaskStatus by Assignee
	ta, err = taskService.UpdateTaskStatus(ctx, designID, epic, story, title, assignee1.ID, "in_progress")
	if err != nil {
		t.Fatalf("UpdateTaskStatus by assignee failed: %v", err)
	}
	if ta.Status != "in_progress" {
		t.Errorf("expected status 'in_progress', got %s", ta.Status)
	}

	// 5. Test UpdateTaskStatus by third party fails
	_, err = taskService.UpdateTaskStatus(ctx, designID, epic, story, title, assignee2.ID, "done")
	if err != ErrNotAssignee {
		t.Errorf("expected ErrNotAssignee, got %v", err)
	}

	// 6. Test AssignTask (upsert) to assignee2 resets status to 'todo'
	ta, err = taskService.AssignTask(ctx, designID, epic, story, title, assignee2.ID, owner.ID)
	if err != nil {
		t.Fatalf("AssignTask upsert failed: %v", err)
	}
	if ta.AssigneeID != assignee2.ID {
		t.Errorf("expected new assignee ID %s, got %s", assignee2.ID, ta.AssigneeID)
	}
	if ta.Status != "todo" {
		t.Errorf("expected upserted status to reset to 'todo', got %s", ta.Status)
	}

	// 7. Test ListDesignTasks
	tasks, err := taskService.ListDesignTasks(ctx, designID)
	if err != nil {
		t.Fatalf("ListDesignTasks failed: %v", err)
	}
	if len(tasks) != 1 {
		t.Errorf("expected 1 task assignment, got %d", len(tasks))
	}

	// 8. Test ListMyTasks
	myTasks, err := taskService.ListMyTasks(ctx, assignee2.ID)
	if err != nil {
		t.Fatalf("ListMyTasks failed: %v", err)
	}
	if len(myTasks) != 1 {
		t.Fatalf("expected 1 task for assignee2, got %d", len(myTasks))
	}
	if myTasks[0].ProjectName != "Project Name" || myTasks[0].WorkspaceName != "Workspace" {
		t.Errorf("expected enriched project/workspace name, got project %q / workspace %q",
			myTasks[0].ProjectName, myTasks[0].WorkspaceName)
	}

	// 9. Test UnassignTask by non-assigner fails
	err = taskService.UnassignTask(ctx, designID, epic, story, title, assignee1.ID)
	if err != ErrTaskAssignmentNotFound {
		t.Errorf("expected ErrTaskAssignmentNotFound for non-assigner, got %v", err)
	}

	// 10. Test UnassignTask by assigner succeeds
	err = taskService.UnassignTask(ctx, designID, epic, story, title, owner.ID)
	if err != nil {
		t.Fatalf("UnassignTask failed: %v", err)
	}

	// Verify task is deleted
	_, err = taskService.ListDesignTasks(ctx, designID)
	if err != nil {
		t.Fatalf("ListDesignTasks failed after deletion: %v", err)
	}
}
