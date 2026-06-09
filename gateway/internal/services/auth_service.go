package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"archon/gateway/internal/db"
	"archon/gateway/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid token")
)

type AuthService struct {
	postgres  *db.PostgresDB
	jwtSecret []byte
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func NewAuthService(postgres *db.PostgresDB, jwtSecret string) *AuthService {
	return &AuthService{
		postgres:  postgres,
		jwtSecret: []byte(jwtSecret),
	}
}

// generateUUID is a lightweight random UUID helper to keep code clean and dependency free
func generateUUID() string {
	bytes := make([]byte, 16)
	_, _ = rand.Read(bytes)
	bytes[6] = (bytes[6] & 0x0f) | 0x40 
	bytes[8] = (bytes[8] & 0x3f) | 0x80 
	return fmt.Sprintf("%x-%x-%x-%x-%x", bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:])
}

// SignUp registers a new user with hashed password
func (s *AuthService) SignUp(ctx context.Context, email, password string) (*models.User, error) {
	var existingID string
	err := s.postgres.DB.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1", email).Scan(&existingID)
	if err == nil {
		return nil, ErrUserAlreadyExists
	} else if !errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	userID := generateUUID()
	now := time.Now()

	_, err = s.postgres.DB.ExecContext(ctx,
		"INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)",
		userID, email, string(hash), now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert user: %w", err)
	}

	return &models.User{
		ID:        userID,
		Email:     email,
		CreatedAt: now,
	}, nil
}

// Login verifies credentials and issues a signed JWT
func (s *AuthService) Login(ctx context.Context, email, password string) (string, error) {
	var user models.User
	err := s.postgres.DB.QueryRowContext(ctx,
		"SELECT id, email, password_hash, created_at FROM users WHERE email = $1", email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)

	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrInvalidCredentials
	} else if err != nil {
		return "", fmt.Errorf("failed to query user for login: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", ErrInvalidCredentials
	}

	claims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign jwt: %w", err)
	}

	return tokenStr, nil
}

// ValidateToken parses and cryptographically verifies the token string, returning the embedded user ID
func (s *AuthService) ValidateToken(tokenStr string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return "", ErrInvalidToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return "", ErrInvalidToken
	}

	return claims.UserID, nil
}

// Helper to generate custom hex-based API keys
func GenerateAPIKey() string {
	bytes := make([]byte, 24)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (s *AuthService) SaveGithubOAuthToken(ctx context.Context, userID, githubUser, accessToken string) error {
	_, err := s.postgres.DB.ExecContext(ctx, `
		INSERT INTO user_github_oauth (user_id, github_user, access_token, connected_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE
		SET github_user = EXCLUDED.github_user,
		    access_token = EXCLUDED.access_token,
		    connected_at = EXCLUDED.connected_at
	`, userID, githubUser, accessToken, time.Now())
	return err
}

func (s *AuthService) GetGithubOAuthToken(ctx context.Context, userID string) (string, string, error) {
	var githubUser, accessToken string
	err := s.postgres.DB.QueryRowContext(ctx, `
		SELECT github_user, access_token
		FROM user_github_oauth
		WHERE user_id = $1
	`, userID).Scan(&githubUser, &accessToken)
	if err != nil {
		return "", "", err
	}
	return githubUser, accessToken, nil
}

func (s *AuthService) DeleteGithubOAuthToken(ctx context.Context, userID string) error {
	_, err := s.postgres.DB.ExecContext(ctx, `
		DELETE FROM user_github_oauth
		WHERE user_id = $1
	`, userID)
	return err
}

