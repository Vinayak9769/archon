package services

import (
	"context"
	"testing"
)

func TestAuthService_SignUpAndLogin(t *testing.T) {
	clearDatabase(t)

	authSecret := "test-secret-key-123456789-test-secret-key"
	service := NewAuthService(testDB, authSecret)
	ctx := context.Background()

	// 1. Test Sign Up
	email := "testuser@example.com"
	password := "supersecurepassword123"

	user, err := service.SignUp(ctx, email, password)
	if err != nil {
		t.Fatalf("SignUp failed: %v", err)
	}

	if user.Email != email {
		t.Errorf("expected email %q, got %q", email, user.Email)
	}
	if user.ID == "" {
		t.Error("expected non-empty user ID")
	}

	// 2. Test Duplicate Sign Up
	_, err = service.SignUp(ctx, email, password)
	if err != ErrUserAlreadyExists {
		t.Errorf("expected ErrUserAlreadyExists, got %v", err)
	}

	// 3. Test Login with Correct Credentials
	token, err := service.Login(ctx, email, password)
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty JWT token")
	}

	// 4. Test Login with Incorrect Password
	_, err = service.Login(ctx, email, "wrongpassword")
	if err != ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials for wrong password, got %v", err)
	}

	// 5. Test Login with Non-Existent Email
	_, err = service.Login(ctx, "nonexistent@example.com", password)
	if err != ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials for non-existent email, got %v", err)
	}

	// 6. Test Token Validation
	parsedUserID, err := service.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if parsedUserID != user.ID {
		t.Errorf("expected user ID %q, got %q", user.ID, parsedUserID)
	}

	// 7. Test Invalid Token
	_, err = service.ValidateToken("invalid.token.here")
	if err != ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}
