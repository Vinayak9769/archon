package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

type DesignHandler struct {
	designService  *services.DesignService
	projectService *services.ProjectService
}

func NewDesignHandler(designService *services.DesignService, projectService *services.ProjectService) *DesignHandler {
	return &DesignHandler{
		designService:  designService,
		projectService: projectService,
	}
}

type designCreateReq struct {
	PRD      string `json:"prd"`
	Provider string `json:"provider"` // "openai" or "gemini"
	Model    string `json:"model"`    // optional model override
}

type designResumeReq struct {
	Action  string          `json:"action"`  // "clarification", "approve", "feedback", "intervention"
	Payload json.RawMessage `json:"payload"` // action-specific JSON payload
}

// CreateDesign starts a new system-design workflow for a project
func (h *DesignHandler) CreateDesign(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	projectID := chi.URLParam(r, "id")

	// Validate project ownership
	_, err := h.projectService.GetProjectByID(r.Context(), projectID, userID)
	if err != nil {
		if errors.Is(err, services.ErrProjectNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "project not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to verify project ownership"})
		return
	}

	var req designCreateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "invalid request body"})
		return
	}

	if req.PRD == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "prd is required"})
		return
	}

	if req.Provider == "" {
		req.Provider = "gemini"
	}

	d, err := h.designService.CreateDesign(r.Context(), projectID, req.PRD, req.Provider, req.Model)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to start design workflow"})
		return
	}

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(d)
}

// GetDesign retrieves the current state of a design workflow
func (h *DesignHandler) GetDesign(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")

	// Sync latest state from AI service before returning
	d, err := h.designService.SyncDesignState(r.Context(), designID)
	if err != nil {
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to retrieve design state"})
		return
	}

	// Verify project ownership
	_, err = h.projectService.GetProjectByID(r.Context(), d.ProjectID, userID)
	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	_ = json.NewEncoder(w).Encode(d)
}

// ResumeDesign resumes a paused workflow with a HITL response
func (h *DesignHandler) ResumeDesign(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")

	// Verify design exists and check ownership
	existing, err := h.designService.GetDesign(r.Context(), designID)
	if err != nil {
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to look up design"})
		return
	}

	_, err = h.projectService.GetProjectByID(r.Context(), existing.ProjectID, userID)
	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	var req designResumeReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "invalid request body"})
		return
	}

	if req.Action == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "action is required"})
		return
	}

	payloadStr := "{}"
	if req.Payload != nil {
		payloadStr = string(req.Payload)
	}

	d, err := h.designService.ResumeDesign(r.Context(), designID, req.Action, payloadStr)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to resume design workflow"})
		return
	}

	_ = json.NewEncoder(w).Encode(d)
}

// ListDesigns lists all design workflows for a project
func (h *DesignHandler) ListDesigns(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	projectID := chi.URLParam(r, "id")

	// Validate project ownership
	_, err := h.projectService.GetProjectByID(r.Context(), projectID, userID)
	if err != nil {
		if errors.Is(err, services.ErrProjectNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "project not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to verify project ownership"})
		return
	}

	list, err := h.designService.ListDesigns(r.Context(), projectID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to list designs"})
		return
	}

	if list == nil {
		_ = json.NewEncoder(w).Encode([]interface{}{})
		return
	}

	_ = json.NewEncoder(w).Encode(list)
}

type backlogReq struct {
	Feedback string `json:"feedback"`
}

// GenerateBacklog triggers backlog generation for a completed design
func (h *DesignHandler) GenerateBacklog(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")

	// Verify design exists and check ownership
	existing, err := h.designService.GetDesign(r.Context(), designID)
	if err != nil {
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to look up design"})
		return
	}

	_, err = h.projectService.GetProjectByID(r.Context(), existing.ProjectID, userID)
	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	var req backlogReq
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	d, err := h.designService.GenerateBacklog(r.Context(), designID, req.Feedback)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to generate backlog: " + err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(d)
}
