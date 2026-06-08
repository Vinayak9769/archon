package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"archon/gateway/internal/models"
	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

type WorkspaceHandler struct {
	workspaceService *services.WorkspaceService
	projectService   *services.ProjectService
}

func NewWorkspaceHandler(ws *services.WorkspaceService, ps *services.ProjectService) *WorkspaceHandler {
	return &WorkspaceHandler{workspaceService: ws, projectService: ps}
}

// POST /api/v1/workspaces
func (h *WorkspaceHandler) CreateWorkspace(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "name is required"})
		return
	}

	ws, err := h.workspaceService.CreateWorkspace(r.Context(), req.Name, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(ws)
}

// GET /api/v1/workspaces
func (h *WorkspaceHandler) ListWorkspaces(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	list, err := h.workspaceService.ListWorkspaces(r.Context(), userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if list == nil {
		list = []*models.Workspace{}
	}
	_ = json.NewEncoder(w).Encode(list)
}

// GET /api/v1/workspaces/{id}
func (h *WorkspaceHandler) GetWorkspace(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	wsID := chi.URLParam(r, "id")

	ws, err := h.workspaceService.GetWorkspace(r.Context(), wsID, userID)
	if errors.Is(err, services.ErrWorkspaceNotFound) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "workspace not found"})
		return
	}
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(ws)
}

// GET /api/v1/workspaces/{id}/members
func (h *WorkspaceHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	wsID := chi.URLParam(r, "id")

	members, err := h.workspaceService.ListMembers(r.Context(), wsID, userID)
	if errors.Is(err, services.ErrNotWorkspaceMember) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "not a member"})
		return
	}
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if members == nil {
		members = []*models.WorkspaceMember{}
	}
	_ = json.NewEncoder(w).Encode(members)
}

// POST /api/v1/workspaces/{id}/members
func (h *WorkspaceHandler) AddMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	wsID := chi.URLParam(r, "id")

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "email is required"})
		return
	}

	member, err := h.workspaceService.AddMember(r.Context(), wsID, userID, req.Email)
	switch {
	case errors.Is(err, services.ErrNotWorkspaceOwner):
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "only the owner can invite members"})
	case errors.Is(err, services.ErrUserNotFound):
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "no registered user with that email"})
	case errors.Is(err, services.ErrAlreadyMember):
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "user is already a member"})
	case err != nil:
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
	default:
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(member)
	}
}

// DELETE /api/v1/workspaces/{id}/members/{userId}
func (h *WorkspaceHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	wsID := chi.URLParam(r, "id")
	memberID := chi.URLParam(r, "userId")

	err := h.workspaceService.RemoveMember(r.Context(), wsID, userID, memberID)
	switch {
	case errors.Is(err, services.ErrNotWorkspaceOwner):
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "only the owner can remove members"})
	case errors.Is(err, services.ErrMemberNotFound):
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "member not found"})
	case err != nil:
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

// GET /api/v1/workspaces/{id}/projects
func (h *WorkspaceHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	wsID := chi.URLParam(r, "id")

	projects, err := h.projectService.ListProjects(r.Context(), wsID, userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if projects == nil {
		projects = nil // keep as nil slice, JSON marshals to []
	}
	_ = json.NewEncoder(w).Encode(projects)
}
