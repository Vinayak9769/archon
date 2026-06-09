package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"archon/gateway/internal/services"
)

type contextKey string

const UserIDContextKey contextKey = "user_id"

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type signUpReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResp struct {
	Token string `json:"token,omitempty"`
	Error string `json:"error,omitempty"`
}

// SignUpHandler registers credentials in local DB
func (h *AuthHandler) SignUpHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req signUpReq

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(authResp{Error: "invalid request body"})
		return
	}

	if req.Email == "" || req.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(authResp{Error: "email and password are required"})
		return
	}

	user, err := h.authService.SignUp(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrUserAlreadyExists) {
			w.WriteHeader(http.StatusConflict)
			_ = json.NewEncoder(w).Encode(authResp{Error: "email address already registered"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(authResp{Error: "internal sign up failure"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"id":    user.ID,
		"email": user.Email,
	})
}

// LoginHandler validates credential matching and yields signed JWT tokens
func (h *AuthHandler) LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req signUpReq

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(authResp{Error: "invalid request body"})
		return
	}

	token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, services.ErrInvalidCredentials) {
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(authResp{Error: "invalid email or password credentials"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(authResp{Error: "internal authentication error"})
		return
	}

	_ = json.NewEncoder(w).Encode(authResp{Token: token})
}

// AuthMiddleware intercepts API calls and cryptographically validates JWT Bearer tokens
func (h *AuthHandler) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(authResp{Error: "authorization header missing"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(authResp{Error: "invalid authorization format"})
			return
		}

		userID, err := h.authService.ValidateToken(parts[1])
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(authResp{Error: "invalid or expired token"})
			return
		}

		// Inject verified userID into request context
		ctx := context.WithValue(r.Context(), UserIDContextKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID retrieves context user ID securely
func GetUserID(ctx context.Context) string {
	val := ctx.Value(UserIDContextKey)
	if val == nil {
		return ""
	}
	if str, ok := val.(string); ok {
		return str
	}
	return ""
}

// GET /api/v1/auth/github/url
func (h *AuthHandler) GetGithubAuthURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	clientID := os.Getenv("GITHUB_CLIENT_ID")
	if clientID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "GitHub OAuth is not configured on the server (missing GITHUB_CLIENT_ID)."})
		return
	}

	redirectURI := os.Getenv("GITHUB_REDIRECT_URI")
	if redirectURI == "" {
		redirectURI = "http://localhost:8080/api/v1/auth/callback/github"
	}

	authURL := fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=repo,user&state=%s",
		clientID, url.QueryEscape(redirectURI), userID)

	_ = json.NewEncoder(w).Encode(map[string]string{"url": authURL})
}

// GET /api/v1/auth/callback/github
func (h *AuthHandler) GithubAuthCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	userID := r.URL.Query().Get("state")

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	if userID == "" || code == "" {
		http.Redirect(w, r, frontendURL+"/settings?error=missing_oauth_params", http.StatusTemporaryRedirect)
		return
	}

	var githubUser string
	var accessToken string

	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURI := os.Getenv("GITHUB_REDIRECT_URI")
	if redirectURI == "" {
		redirectURI = "http://localhost:8080/api/v1/auth/callback/github"
	}

	// Exchange code for token
	tokenURL := "https://github.com/login/oauth/access_token"
	form := url.Values{}
	form.Set("client_id", clientID)
	form.Set("client_secret", clientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", redirectURI)

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		http.Redirect(w, r, frontendURL+"/settings?error=token_request_failed", http.StatusTemporaryRedirect)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Redirect(w, r, frontendURL+"/settings?error=token_exchange_network_error", http.StatusTemporaryRedirect)
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil || tokenResp.Error != "" || tokenResp.AccessToken == "" {
		http.Redirect(w, r, frontendURL+"/settings?error=token_exchange_rejected", http.StatusTemporaryRedirect)
		return
	}
	accessToken = tokenResp.AccessToken

	// Fetch profile info
	userReq, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		http.Redirect(w, r, frontendURL+"/settings?error=profile_request_failed", http.StatusTemporaryRedirect)
		return
	}
	userReq.Header.Set("Authorization", "token "+accessToken)
	userReq.Header.Set("Accept", "application/vnd.github.v3+json")

	userResp, err := client.Do(userReq)
	if err != nil {
		http.Redirect(w, r, frontendURL+"/settings?error=profile_network_error", http.StatusTemporaryRedirect)
		return
	}
	defer userResp.Body.Close()

	var profile struct {
		Login string `json:"login"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&profile); err != nil || profile.Login == "" {
		http.Redirect(w, r, frontendURL+"/settings?error=profile_parse_error", http.StatusTemporaryRedirect)
		return
	}
	githubUser = profile.Login

	// Save to DB
	if err := h.authService.SaveGithubOAuthToken(r.Context(), userID, githubUser, accessToken); err != nil {
		http.Redirect(w, r, frontendURL+"/settings?error=db_save_failed", http.StatusTemporaryRedirect)
		return
	}

	http.Redirect(w, r, frontendURL+"/settings?github=connected&username="+githubUser, http.StatusTemporaryRedirect)
}

// GET /api/v1/auth/github/status
func (h *AuthHandler) GetGithubAuthStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	username, _, err := h.authService.GetGithubOAuthToken(r.Context(), userID)
	if err != nil {
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"connected": false})
		return
	}
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"connected": true,
		"username":  username,
	})
}

// DELETE /api/v1/auth/github
func (h *AuthHandler) DisconnectGithubAuth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	if err := h.authService.DeleteGithubOAuthToken(r.Context(), userID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/auth/github/repos
func (h *AuthHandler) GetGithubRepos(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID := GetUserID(r.Context())
	if userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	_, token, err := h.authService.GetGithubOAuthToken(r.Context(), userID)
	if err != nil || token == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "GitHub account not connected. Please link your GitHub account in Settings first."})
		return
	}

	// Fetch repos from GitHub
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://api.github.com/user/repos?per_page=100&sort=updated", nil)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to create request: " + err.Error()})
		return
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to connect to GitHub: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		resBytes, _ := io.ReadAll(resp.Body)
		w.WriteHeader(resp.StatusCode)
		w.Write(resBytes)
		return
	}

	type GithubRepoItem struct {
		Name     string `json:"name"`
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	}

	var repos []GithubRepoItem
	if err := json.NewDecoder(resp.Body).Decode(&repos); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to decode repositories: " + err.Error()})
		return
	}

	_ = json.NewEncoder(w).Encode(repos)
}


