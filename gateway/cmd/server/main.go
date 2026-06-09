package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"archon/gateway/internal/aiclient"
	"archon/gateway/internal/config"
	"archon/gateway/internal/db"
	"archon/gateway/internal/handlers"
	"archon/gateway/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func main() {
	log.Println("Starting Archon Go Gateway...")

	// 1. Load System Configurations
	cfg := config.LoadConfig()

	// 2. Connect to PostgreSQL
	log.Println("Connecting to PostgreSQL...")
	postgres, err := db.ConnectPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Critical: PostgreSQL initialization failed: %v", err)
	}
	defer func() {
		log.Println("Closing PostgreSQL connection pool...")
		_ = postgres.Close()
	}()
	log.Println("PostgreSQL connection verified and schemas initialized.")

	// 3. Connect to Redis
	log.Println("Connecting to Redis...")
	redisClient, err := db.ConnectRedis(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Critical: Redis initialization failed: %v", err)
	}
	defer func() {
		log.Println("Closing Redis connection...")
		_ = redisClient.Close()
	}()
	log.Println("Redis connectivity verified.")

	// 4. Connect to AI Service (gRPC)
	log.Printf("Connecting to AI service at %s...", cfg.AIServiceURL)
	aiClient, err := aiclient.NewClient(cfg.AIServiceURL)
	if err != nil {
		log.Printf("Warning: AI service connection failed: %v (designs will fail until AI service is running)", err)
		// Don't fatal — gateway can start without AI service for auth/project endpoints
	}
	defer func() {
		if aiClient != nil {
			log.Println("Closing AI service gRPC connection...")
			_ = aiClient.Close()
		}
	}()

	// 5. Initialize Core Logic Services
	authService := services.NewAuthService(postgres, cfg.JWTSecret)
	projectService := services.NewProjectService(postgres)
	designService := services.NewDesignService(postgres, aiClient)
	workspaceService := services.NewWorkspaceService(postgres)
	taskService := services.NewTaskService(postgres)

	// Backfill: create personal workspaces for users with orphan projects
	if err := workspaceService.BackfillPersonalWorkspaces(context.Background()); err != nil {
		log.Printf("Warning: workspace backfill failed: %v", err)
	}

	// 6. Initialize Route Controllers
	authHandler := handlers.NewAuthHandler(authService)
	projectHandler := handlers.NewProjectHandler(projectService)
	designHandler := handlers.NewDesignHandler(designService, projectService)
	exportHandler := handlers.NewExportHandler(designService, projectService, aiClient)
	workspaceHandler := handlers.NewWorkspaceHandler(workspaceService, projectService)
	taskHandler := handlers.NewTaskHandler(taskService, workspaceService, designService, aiClient)
	reviewHandler := handlers.NewReviewHandler(projectService)

	// 7. Setup HTTP Router & Middleware Tree
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(120 * time.Second))

	// CORS Simple Setup
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	// Public Routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	r.Post("/api/v1/auth/signup", authHandler.SignUpHandler)
	r.Post("/api/v1/auth/login", authHandler.LoginHandler)
	r.Get("/api/v1/auth/callback/github", authHandler.GithubAuthCallback)

	// Protected Routes Group
	r.Group(func(p chi.Router) {
		p.Use(authHandler.AuthMiddleware)

		// GitHub User OAuth Endpoints
		p.Get("/api/v1/auth/github/url", authHandler.GetGithubAuthURL)
		p.Get("/api/v1/auth/github/status", authHandler.GetGithubAuthStatus)
		p.Delete("/api/v1/auth/github", authHandler.DisconnectGithubAuth)
		p.Get("/api/v1/auth/github/repos", authHandler.GetGithubRepos)

		// Workspace Endpoints
		p.Post("/api/v1/workspaces", workspaceHandler.CreateWorkspace)
		p.Get("/api/v1/workspaces", workspaceHandler.ListWorkspaces)
		p.Get("/api/v1/workspaces/{id}", workspaceHandler.GetWorkspace)
		p.Get("/api/v1/workspaces/{id}/members", workspaceHandler.ListMembers)
		p.Post("/api/v1/workspaces/{id}/members", workspaceHandler.AddMember)
		p.Delete("/api/v1/workspaces/{id}/members/{userId}", workspaceHandler.RemoveMember)
		p.Get("/api/v1/workspaces/{id}/projects", workspaceHandler.ListProjects)

		// Projects Endpoints
		p.Post("/api/v1/projects", projectHandler.CreateProject)
		p.Get("/api/v1/projects", projectHandler.ListProjects)
		p.Get("/api/v1/projects/{id}", projectHandler.GetProjectByID)
		p.Patch("/api/v1/projects/{id}", projectHandler.UpdateProject)
		p.Delete("/api/v1/projects/{id}", projectHandler.DeleteProject)

		// Design Workflow Endpoints
		p.Post("/api/v1/projects/{id}/designs", designHandler.CreateDesign)
		p.Get("/api/v1/projects/{id}/designs", designHandler.ListDesigns)
		p.Get("/api/v1/designs/{id}", designHandler.GetDesign)
		p.Post("/api/v1/designs/{id}/resume", designHandler.ResumeDesign)
		p.Post("/api/v1/designs/{id}/backlog", designHandler.GenerateBacklog)

		// Task Assignment Endpoints
		p.Post("/api/v1/designs/{id}/tasks/assign", taskHandler.AssignTask)
		p.Delete("/api/v1/designs/{id}/tasks/assign", taskHandler.UnassignTask)
		p.Patch("/api/v1/designs/{id}/tasks/status", taskHandler.UpdateTaskStatus)
		p.Get("/api/v1/designs/{id}/tasks", taskHandler.ListDesignTasks)
		p.Get("/api/v1/me/tasks", taskHandler.ListMyTasks)

		p.Get("/api/v1/tasks/{id}", taskHandler.GetTaskByID)
		p.Get("/api/v1/tasks/{id}/messages", taskHandler.ListTaskMessages)
		p.Post("/api/v1/tasks/{id}/messages", taskHandler.CreateTaskMessage)
		p.Post("/api/v1/tasks/{id}/github/issue/draft", taskHandler.DraftGithubIssueForTask)
		p.Post("/api/v1/tasks/{id}/github/issue", taskHandler.CreateGithubIssueForTask)
		p.Delete("/api/v1/tasks/{id}/github/issue", taskHandler.UnlinkGithubIssueForTask)
		p.Get("/api/v1/settings/github-app", taskHandler.GetGithubAppSettings)
		p.Post("/api/v1/settings/github-app", taskHandler.UpdateGithubAppSettings)
		p.Get("/api/v1/settings/github-app/install-url", taskHandler.GetGithubAppInstallURL)

		// GitHub PR Review Endpoints
		p.Get("/api/v1/github/prs", reviewHandler.ListRepoPRs)
		p.Get("/api/v1/github/prs/{number}", reviewHandler.GetPRDetails)
		p.Get("/api/v1/github/prs/{number}/files", reviewHandler.GetPRFiles)
		p.Get("/api/v1/github/prs/{number}/checks", reviewHandler.GetPRChecks)
		p.Get("/api/v1/github/prs/{number}/reviewers", reviewHandler.GetPRReviewers)
		p.Post("/api/v1/github/prs/{number}/reviewers", reviewHandler.AddPRReviewer)
		p.Delete("/api/v1/github/prs/{number}/reviewers", reviewHandler.RemovePRReviewer)
		p.Post("/api/v1/github/prs/{number}/reviews", reviewHandler.SubmitPRReview)
		p.Post("/api/v1/github/prs/{number}/comments", reviewHandler.CreatePRComment)
		p.Post("/api/v1/github/prs/{number}/merge", reviewHandler.MergePR)
		p.Get("/api/v1/github/repos/collaborators", reviewHandler.GetRepoCollaborators)

		// Artifact Export Endpoints
		p.Get("/api/v1/designs/{id}/export", exportHandler.ExportZip)
		p.Get("/api/v1/designs/{id}/export/manifest", exportHandler.ExportManifest)
		p.Get("/api/v1/designs/{id}/export/file", exportHandler.ExportFile)
	})

	// 8. Start HTTP Server with Graceful Shutdown hooks
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverErrors := make(chan error, 1)

	go func() {
		log.Printf("Gateway HTTP server listening on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrors <- err
		}
	}()

	// Signal channels to intercept system kills
	shutdownSig := make(chan os.Signal, 1)
	signal.Notify(shutdownSig, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		log.Fatalf("Critical: HTTP server failure: %v", err)

	case sig := <-shutdownSig:
		log.Printf("Graceful Shutdown: Intercepted system signal %v. Draining server connections...", sig)

		// Context with timeout to drain active request streams safely
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("Warning: Failed to shutdown server cleanly: %v. Forcing closing.", err)
			_ = srv.Close()
		}
	}

	log.Println("Archon Go Gateway terminated cleanly.")
}
