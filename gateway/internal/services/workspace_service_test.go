package services

import (
	"context"
	"testing"
	"time"
)

func TestWorkspaceService_ManageWorkspace(t *testing.T) {
	clearDatabase(t)

	authService := NewAuthService(testDB, "secret")
	wsService := NewWorkspaceService(testDB)
	ctx := context.Background()

	// 1. Create Owner and Member users
	owner, err := authService.SignUp(ctx, "owner@example.com", "password")
	if err != nil {
		t.Fatalf("Failed to create owner: %v", err)
	}
	member, err := authService.SignUp(ctx, "member@example.com", "password")
	if err != nil {
		t.Fatalf("Failed to create member: %v", err)
	}

	// 2. Create Workspace
	wsName := "Acme Corp Workspace"
	ws, err := wsService.CreateWorkspace(ctx, wsName, owner.ID)
	if err != nil {
		t.Fatalf("CreateWorkspace failed: %v", err)
	}
	if ws.Name != wsName {
		t.Errorf("expected workspace name %q, got %q", wsName, ws.Name)
	}
	if ws.OwnerID != owner.ID {
		t.Errorf("expected owner ID %q, got %q", owner.ID, ws.OwnerID)
	}

	// 3. Verify owner is workspace member and owner
	isOwner, err := wsService.IsOwner(ctx, ws.ID, owner.ID)
	if err != nil || !isOwner {
		t.Errorf("expected owner to be workspace owner, err: %v", err)
	}
	isMember, err := wsService.IsMember(ctx, ws.ID, owner.ID)
	if err != nil || !isMember {
		t.Errorf("expected owner to be workspace member, err: %v", err)
	}

	// 4. Test ListWorkspaces for Owner
	workspaces, err := wsService.ListWorkspaces(ctx, owner.ID)
	if err != nil {
		t.Fatalf("ListWorkspaces failed: %v", err)
	}
	if len(workspaces) != 1 || workspaces[0].ID != ws.ID {
		t.Errorf("expected exactly one workspace %s, got %d workspaces", ws.ID, len(workspaces))
	}

	// 5. Test AddMember
	addedMem, err := wsService.AddMember(ctx, ws.ID, owner.ID, "member@example.com")
	if err != nil {
		t.Fatalf("AddMember failed: %v", err)
	}
	if addedMem.Role != "member" {
		t.Errorf("expected member role, got %s", addedMem.Role)
	}
	if addedMem.Email != "member@example.com" {
		t.Errorf("expected member email to match, got %s", addedMem.Email)
	}

	// Verify added user is now a member
	isMember, err = wsService.IsMember(ctx, ws.ID, member.ID)
	if err != nil || !isMember {
		t.Errorf("expected member user to be workspace member, err: %v", err)
	}
	isOwner, err = wsService.IsOwner(ctx, ws.ID, member.ID)
	if err != nil || isOwner {
		t.Errorf("expected member user NOT to be workspace owner, err: %v", err)
	}

	// 6. Test duplicate AddMember fails
	_, err = wsService.AddMember(ctx, ws.ID, owner.ID, "member@example.com")
	if err != ErrAlreadyMember {
		t.Errorf("expected ErrAlreadyMember, got %v", err)
	}

	// 7. Test AddMember by non-owner fails
	_, err = wsService.AddMember(ctx, ws.ID, member.ID, "owner@example.com")
	if err != ErrNotWorkspaceOwner {
		t.Errorf("expected ErrNotWorkspaceOwner, got %v", err)
	}

	// 8. Test ListMembers
	mems, err := wsService.ListMembers(ctx, ws.ID, owner.ID)
	if err != nil {
		t.Fatalf("ListMembers failed: %v", err)
	}
	if len(mems) != 2 {
		t.Errorf("expected 2 members, got %d", len(mems))
	}

	// 9. Test RemoveMember by non-owner fails
	err = wsService.RemoveMember(ctx, ws.ID, member.ID, member.ID)
	if err != ErrNotWorkspaceOwner {
		t.Errorf("expected ErrNotWorkspaceOwner, got %v", err)
	}

	// 10. Test RemoveMember by owner succeeds
	err = wsService.RemoveMember(ctx, ws.ID, owner.ID, member.ID)
	if err != nil {
		t.Fatalf("RemoveMember failed: %v", err)
	}

	// Verify member is no longer in workspace
	isMember, err = wsService.IsMember(ctx, ws.ID, member.ID)
	if err != nil || isMember {
		t.Errorf("expected member user NOT to be workspace member after removal, err: %v", err)
	}
}

func TestWorkspaceService_BackfillPersonalWorkspaces(t *testing.T) {
	clearDatabase(t)

	authService := NewAuthService(testDB, "secret")
	wsService := NewWorkspaceService(testDB)
	ctx := context.Background()

	// 1. Create a user
	user, err := authService.SignUp(ctx, "backfill@example.com", "password")
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	// 2. Create a project without a workspace (orphan project)
	projectID := "orphan-project-uuid"
	_, err = testDB.DB.ExecContext(ctx,
		"INSERT INTO projects (id, name, repo_url, branch, owner_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
		projectID, "Orphan Project", "http://github.com/test", "main", user.ID, time.Now(),
	)
	if err != nil {
		t.Fatalf("Failed to create orphan project: %v", err)
	}

	// 3. Trigger backfill
	err = wsService.BackfillPersonalWorkspaces(ctx)
	if err != nil {
		t.Fatalf("BackfillPersonalWorkspaces failed: %v", err)
	}

	// 4. Verify user has a Personal Workspace
	workspaces, err := wsService.ListWorkspaces(ctx, user.ID)
	if err != nil {
		t.Fatalf("ListWorkspaces failed: %v", err)
	}
	if len(workspaces) != 1 {
		t.Fatalf("expected exactly 1 workspace to be created, got %d", len(workspaces))
	}
	if workspaces[0].Name != "Personal Workspace" {
		t.Errorf("expected workspace name 'Personal Workspace', got %q", workspaces[0].Name)
	}

	// 5. Verify the project is now linked to this workspace
	var linkedWSID string
	err = testDB.DB.QueryRowContext(ctx, "SELECT workspace_id FROM projects WHERE id = $1", projectID).Scan(&linkedWSID)
	if err != nil {
		t.Fatalf("Failed to query project workspace: %v", err)
	}
	if linkedWSID != workspaces[0].ID {
		t.Errorf("expected project to be linked to workspace %s, got %s", workspaces[0].ID, linkedWSID)
	}
}
