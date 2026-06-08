package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

type ProjectHandler struct {
	projectService *services.ProjectService
}

func NewProjectHandler(projectService *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{projectService: projectService}
}

type projectCreateReq struct {
	Name        string `json:"name"`
	RepoURL     string `json:"repo_url"`
	Branch      string `json:"branch"`
	WorkspaceID string `json:"workspace_id"`
}

type errorResp struct {
	Error string `json:"error"`
}

// CreateProject connects a codebase repository to a user
func (h *ProjectHandler) CreateProject(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	var req projectCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "invalid request body"})
		return
	}

	if req.Name == "" || req.RepoURL == "" || req.Branch == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "name, repo_url, branch, and workspace_id are required"})
		return
	}

	p, err := h.projectService.CreateProject(r.Context(), req.Name, req.RepoURL, req.Branch, userID, req.WorkspaceID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to create codebase connection"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(p)
}

// ListProjects retrieves all codebases owned by the authenticated user
func (h *ProjectHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	list, err := h.projectService.ListProjectsByOwner(r.Context(), userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to query repositories"})
		return
	}

	// Make sure we output empty list as JSON array [] rather than null
	if list == nil {
		_ = json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	_ = json.NewEncoder(w).Encode(list)
}

// GetProjectByID retrieves metadata for a specific repository
func (h *ProjectHandler) GetProjectByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	projectID := chi.URLParam(r, "id")
	p, err := h.projectService.GetProjectByID(r.Context(), projectID, userID)
	if err != nil {
		if errors.Is(err, services.ErrProjectNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "repository connection not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to retrieve repository metadata"})
		return
	}

	_ = json.NewEncoder(w).Encode(p)
}
