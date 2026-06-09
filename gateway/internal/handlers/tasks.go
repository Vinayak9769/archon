package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"archon/gateway/internal/aiclient"
	"archon/gateway/internal/models"
	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

type TaskHandler struct {
	taskService      *services.TaskService
	workspaceService *services.WorkspaceService
	designService    *services.DesignService
	ai               *aiclient.Client
}

func NewTaskHandler(ts *services.TaskService, ws *services.WorkspaceService, ds *services.DesignService, ai *aiclient.Client) *TaskHandler {
	return &TaskHandler{taskService: ts, workspaceService: ws, designService: ds, ai: ai}
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

// GET /api/v1/tasks/{id}
func (h *TaskHandler) GetTaskByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	ta, err := h.taskService.GetTaskByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrTaskAssignmentNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "task not found"})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		}
		return
	}
	_ = json.NewEncoder(w).Encode(ta)
}

// GET /api/v1/tasks/{id}/messages
func (h *TaskHandler) ListTaskMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	msgs, err := h.taskService.ListTaskMessages(r.Context(), id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	if msgs == nil {
		msgs = []*models.TaskMessage{}
	}
	_ = json.NewEncoder(w).Encode(msgs)
}

// POST /api/v1/tasks/{id}/messages
func (h *TaskHandler) CreateTaskMessage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")
	userID := GetUserID(r.Context())

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "content is required"})
		return
	}

	// Fetch sender's email/name
	senderEmail := "unknown@archon.dev"
	if userID != "" {
		email, err := h.taskService.GetUserEmailByID(r.Context(), userID)
		if err == nil {
			senderEmail = email
		}
	}

	role := "member"
	senderName := senderEmail
	if strings.Contains(senderEmail, "@archon.internal") || strings.Contains(senderEmail, "ai@") {
		role = "agent"
		senderName = "Archon System"
	} else if userID != "" {
		// Mock name for the user
		parts := strings.Split(senderEmail, "@")
		if len(parts) > 0 {
			senderName = strings.Title(strings.ReplaceAll(parts[0], ".", " "))
		}
	}

	var senderIDPtr *string
	if userID != "" {
		senderIDPtr = &userID
	}

	msg, err := h.taskService.CreateTaskMessage(r.Context(), id, senderIDPtr, senderName, role, req.Content)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(msg)
}

// POST /api/v1/tasks/{id}/github/issue/draft
// Step 1: ask the AI agent for clarifying questions about the task.
func (h *TaskHandler) DraftGithubIssueForTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	ta, err := h.taskService.GetTaskByID(r.Context(), id)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "task not found"})
		return
	}

	// Fetch thread messages for context
	msgs, err := h.taskService.ListTaskMessages(r.Context(), id)
	if err != nil {
		msgs = []*models.TaskMessage{} // non-fatal
	}

	ai_msgs := make([]aiclient.TaskMessageInput, 0, len(msgs))
	for _, m := range msgs {
		ai_msgs = append(ai_msgs, aiclient.TaskMessageInput{
			Role:    m.Role,
			Content: m.Content,
			Sender:  m.SenderName,
		})
	}

	result, err := h.ai.GenerateIssueDraft(
		r.Context(),
		ta.TaskTitle, ta.EpicName, ta.StoryName, ta.ProjectName, ta.WorkspaceName, "",
		ai_msgs,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "AI draft generation failed: " + err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(map[string]interface{}{"questions": result.Questions})
}

// POST /api/v1/tasks/{id}/github/issue
// Step 2: receive user answers, generate AI issue content, create via GitHub App token.
func (h *TaskHandler) CreateGithubIssueForTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	var req struct {
		Answers []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		} `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	ta, err := h.taskService.GetTaskByID(r.Context(), id)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "task not found"})
		return
	}

	repoURL, _, err := h.taskService.GetProjectRepoByDesignID(r.Context(), ta.DesignID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to fetch project repository: " + err.Error()})
		return
	}

	owner, repo, ok := parseGitHubRepo(repoURL)
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "No valid GitHub repository linked. Configure a repository in project settings first."})
		return
	}

	// Fetch thread messages for AI context
	msgs, _ := h.taskService.ListTaskMessages(r.Context(), id)
	ai_msgs := make([]aiclient.TaskMessageInput, 0, len(msgs))
	for _, m := range msgs {
		ai_msgs = append(ai_msgs, aiclient.TaskMessageInput{
			Role:    m.Role,
			Content: m.Content,
			Sender:  m.SenderName,
		})
	}

	ai_answers := make([]aiclient.IssueAnswerInput, 0, len(req.Answers))
	for _, a := range req.Answers {
		ai_answers = append(ai_answers, aiclient.IssueAnswerInput{
			Question: a.Question,
			Answer:   a.Answer,
		})
	}

	// Step 2a: Ask the AI to finalize the issue content
	finalized, err := h.ai.FinalizeIssue(
		r.Context(),
		ta.TaskTitle, ta.EpicName, ta.StoryName, ta.ProjectName, ta.WorkspaceName, "",
		ai_msgs, ai_answers,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "AI issue generation failed: " + err.Error()})
		return
	}

	// Step 2b: Get a GitHub App installation access token (JWT-based, dynamic)
	appToken, err := getGithubAppInstallationToken(owner)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Failed to obtain GitHub App token: " + err.Error()})
		return
	}

	// Step 2c: Create the issue on GitHub
	issueURL, err := createActualGitHubIssue(owner, repo, appToken, finalized.Title, finalized.Body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "GitHub API issue creation failed: " + err.Error()})
		return
	}

	if err := h.taskService.UpdateTaskGithubIssue(r.Context(), id, issueURL); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to link issue in database: " + err.Error()})
		return
	}

	ta.GithubIssueURL = issueURL
	_ = json.NewEncoder(w).Encode(ta)
}

// DELETE /api/v1/tasks/{id}/github/issue
func (h *TaskHandler) UnlinkGithubIssueForTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	id := chi.URLParam(r, "id")

	if err := h.taskService.UpdateTaskGithubIssue(r.Context(), id, ""); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/settings/github-app
func (h *TaskHandler) GetGithubAppSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	cfg, err := h.taskService.GetGithubAppSettings(r.Context())
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	_ = json.NewEncoder(w).Encode(cfg)
}

// POST /api/v1/settings/github-app
func (h *TaskHandler) UpdateGithubAppSettings(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req struct {
		Installed        bool   `json:"installed"`
		InstallationType string `json:"installation_type"`
		Repositories     string `json:"repositories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid payload"})
		return
	}

	err := h.taskService.UpdateGithubAppSettings(r.Context(), req.Installed, req.InstallationType, req.Repositories)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/settings/github-app/install-url
// Returns the GitHub App installation URL so the frontend can redirect the user there.
func (h *TaskHandler) GetGithubAppInstallURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	slug := os.Getenv("GITHUB_APP_SLUG")
	if slug == "" {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "GITHUB_APP_SLUG is not configured on the server"})
		return
	}

	installURL := fmt.Sprintf("https://github.com/apps/%s/installations/new", slug)
	_ = json.NewEncoder(w).Encode(map[string]string{"url": installURL})
}

// ── Helpers ──────────────────────────────────────────────────────────────────

func parseGitHubRepo(repoURL string) (string, string, bool) {
	clean := strings.TrimSuffix(strings.TrimSpace(repoURL), ".git")
	if clean == "" {
		return "", "", false
	}
	if strings.Contains(clean, "git@github.com:") {
		parts := strings.Split(strings.TrimPrefix(clean, "git@github.com:"), "/")
		if len(parts) >= 2 {
			return parts[0], parts[1], true
		}
	}
	parts := strings.Split(clean, "/")
	for i := 0; i < len(parts); i++ {
		if (parts[i] == "github.com" || strings.Contains(parts[i], "github")) && i+2 < len(parts) {
			return parts[i+1], parts[i+2], true
		}
	}
	return "", "", false
}

func createActualGitHubIssue(owner, repo, token, title, body string) (string, error) {
	apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues", owner, repo)
	reqBody, _ := json.Marshal(map[string]interface{}{
		"title": title,
		"body":  body,
	})
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		resBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("github API returned status %d: %s", resp.StatusCode, string(resBytes))
	}

	var result struct {
		HTMLURL string `json:"html_url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	return result.HTMLURL, nil
}

