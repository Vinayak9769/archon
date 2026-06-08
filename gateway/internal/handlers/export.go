package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"archon/gateway/internal/aiclient"
	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
)

// ExportHandler handles artifact export requests.
type ExportHandler struct {
	designService  *services.DesignService
	projectService *services.ProjectService
	ai             *aiclient.Client
}

func NewExportHandler(
	designService *services.DesignService,
	projectService *services.ProjectService,
	ai *aiclient.Client,
) *ExportHandler {
	return &ExportHandler{
		designService:  designService,
		projectService: projectService,
		ai:             ai,
	}
}

// exportFileMetadata is the JSON summary of one exported file.
type exportFileMetadata struct {
	Filename  string `json:"filename"`
	SizeBytes int64  `json:"size_bytes"`
}

// ExportMetadataResponse is returned by the manifest endpoint.
type ExportMetadataResponse struct {
	Files                []exportFileMetadata `json:"files"`
	TotalSizeBytes       int64                `json:"total_size_bytes"`
	HadProjectModel      bool                 `json:"had_project_model"`
	HadArchitectureModel bool                 `json:"had_architecture_model"`
	HadDatabaseModel     bool                 `json:"had_database_model"`
	HadOpenAPIModel      bool                 `json:"had_openapi_model"`
}

// safePtrStr dereferences a *string safely, returning "" for nil.
func safePtrStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// ExportZip generates a ZIP bundle of all design artifacts and streams it back
// as application/zip. Triggers browser download with a sensible filename.
//
//	GET /api/v1/designs/{id}/export
func (h *ExportHandler) ExportZip(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")

	d, err := h.designService.GetDesign(r.Context(), designID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to retrieve design"})
		return
	}

	// Verify project ownership
	_, err = h.projectService.GetProjectByID(r.Context(), d.ProjectID, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	result, err := h.ai.ExportArtifacts(
		r.Context(),
		safePtrStr(d.ProjectModel),
		safePtrStr(d.ArchitectureModel),
		safePtrStr(d.DatabaseModel),
		safePtrStr(d.OpenAPIModel),
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: fmt.Sprintf("export failed: %v", err)})
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="archon-design-%s.zip"`, designID[:8]))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(result.ZipBytes)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(result.ZipBytes)
}

// ExportManifest returns JSON metadata about what artifacts would be exported,
// without generating the full ZIP. Useful for showing the user what's ready.
//
//	GET /api/v1/designs/{id}/export/manifest
func (h *ExportHandler) ExportManifest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")

	d, err := h.designService.GetDesign(r.Context(), designID)
	if err != nil {
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to retrieve design"})
		return
	}

	_, err = h.projectService.GetProjectByID(r.Context(), d.ProjectID, userID)
	if err != nil {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	result, err := h.ai.ExportArtifacts(
		r.Context(),
		safePtrStr(d.ProjectModel),
		safePtrStr(d.ArchitectureModel),
		safePtrStr(d.DatabaseModel),
		safePtrStr(d.OpenAPIModel),
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: fmt.Sprintf("export failed: %v", err)})
		return
	}

	files := make([]exportFileMetadata, 0, len(result.Files))
	for _, f := range result.Files {
		files = append(files, exportFileMetadata{
			Filename:  f.Filename,
			SizeBytes: f.SizeBytes,
		})
	}

	_ = json.NewEncoder(w).Encode(ExportMetadataResponse{
		Files:                files,
		TotalSizeBytes:       result.TotalSizeBytes,
		HadProjectModel:      result.HadProjectModel,
		HadArchitectureModel: result.HadArchitectureModel,
		HadDatabaseModel:     result.HadDatabaseModel,
		HadOpenAPIModel:      result.HadOpenAPIModel,
	})
}

// ExportFile returns the content of a single artifact file by filename.
//
//	GET /api/v1/designs/{id}/export/file?name=schema.sql
func (h *ExportHandler) ExportFile(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r.Context())
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "unauthorized"})
		return
	}

	designID := chi.URLParam(r, "id")
	filename := r.URL.Query().Get("name")
	if filename == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "query param 'name' is required"})
		return
	}

	d, err := h.designService.GetDesign(r.Context(), designID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		if errors.Is(err, services.ErrDesignNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(errorResp{Error: "design not found"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "failed to retrieve design"})
		return
	}

	_, err = h.projectService.GetProjectByID(r.Context(), d.ProjectID, userID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(errorResp{Error: "forbidden"})
		return
	}

	result, err := h.ai.ExportArtifacts(
		r.Context(),
		safePtrStr(d.ProjectModel),
		safePtrStr(d.ArchitectureModel),
		safePtrStr(d.DatabaseModel),
		safePtrStr(d.OpenAPIModel),
	)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(errorResp{Error: fmt.Sprintf("export failed: %v", err)})
		return
	}

	for _, f := range result.Files {
		if f.Filename == filename {
			contentType := contentTypeForFilename(filename)
			w.Header().Set("Content-Type", contentType)
			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(f.Content))
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_ = json.NewEncoder(w).Encode(errorResp{Error: fmt.Sprintf("file '%s' not found in export", filename)})
}

// contentTypeForFilename maps artifact filenames to appropriate MIME types.
func contentTypeForFilename(filename string) string {
	mapping := map[string]string{
		"architecture.mmd":  "text/plain; charset=utf-8",
		"architecture.json": "application/json",
		"schema.sql":        "application/sql",
		"schema.dbml":       "text/plain; charset=utf-8",
		"openapi.yaml":      "application/yaml",
		"project_model.json": "application/json",
		"summary.md":        "text/markdown; charset=utf-8",
	}
	if ct, ok := mapping[filename]; ok {
		return ct
	}
	return "text/plain; charset=utf-8"
}
