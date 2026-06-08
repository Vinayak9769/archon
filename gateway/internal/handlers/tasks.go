package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"archon/gateway/internal/models"
	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

type TaskHandler struct {
	taskService      *services.TaskService
	workspaceService *services.WorkspaceService
	designService    *services.DesignService
}

func NewTaskHandler(ts *services.TaskService, ws *services.WorkspaceService, ds *services.DesignService) *TaskHandler {
	return &TaskHandler{taskService: ts, workspaceService: ws, designService: ds}
}

type taskKeyReq struct {
	EpicName  string `json:"epic_name"`
	StoryName string `json:"story_name"`
	TaskTitle string `json:"task_title"`
}

// POST /api/v1/designs/{id}/tasks/assign
func (h *TaskHandler) AssignTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	designID := chi.URLParam(r, "id")

	var req struct {
		taskKeyReq
		AssigneeID string `json:"assignee_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}
	if req.EpicName == "" || req.StoryName == "" || req.TaskTitle == "" || req.AssigneeID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "epic_name, story_name, task_title, assignee_id are required"})
		return
	}

	ta, err := h.taskService.AssignTask(r.Context(),
		designID, req.EpicName, req.StoryName, req.TaskTitle,
		req.AssigneeID, userID,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(ta)
}

// DELETE /api/v1/designs/{id}/tasks/assign
func (h *TaskHandler) UnassignTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	designID := chi.URLParam(r, "id")

	var req taskKeyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	err := h.taskService.UnassignTask(r.Context(),
		designID, req.EpicName, req.StoryName, req.TaskTitle, userID,
	)
	switch {
	case errors.Is(err, services.ErrTaskAssignmentNotFound):
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "assignment not found"})
	case err != nil:
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

// PATCH /api/v1/designs/{id}/tasks/status
func (h *TaskHandler) UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	designID := chi.URLParam(r, "id")

	var req struct {
		taskKeyReq
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	validStatuses := map[string]bool{"todo": true, "in_progress": true, "done": true}
	if !validStatuses[req.Status] {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "status must be todo, in_progress, or done"})
		return
	}

	ta, err := h.taskService.UpdateTaskStatus(r.Context(),
		designID, req.EpicName, req.StoryName, req.TaskTitle, userID, req.Status,
	)
	switch {
	case errors.Is(err, services.ErrNotAssignee):
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "only the assignee or assigner can update status"})
	case errors.Is(err, services.ErrTaskAssignmentNotFound):
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "assignment not found"})
	case err != nil:
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
	default:
		_ = json.NewEncoder(w).Encode(ta)
	}
}

// GET /api/v1/designs/{id}/tasks
func (h *TaskHandler) ListDesignTasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	designID := chi.URLParam(r, "id")

	tasks, err := h.taskService.ListDesignTasks(r.Context(), designID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if tasks == nil {
		tasks = []*models.TaskAssignment{}
	}
	_ = json.NewEncoder(w).Encode(tasks)
}

// GET /api/v1/me/tasks
func (h *TaskHandler) ListMyTasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	tasks, err := h.taskService.ListMyTasks(r.Context(), userID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if tasks == nil {
		tasks = []*models.TaskAssignment{}
	}
	_ = json.NewEncoder(w).Encode(tasks)
}
