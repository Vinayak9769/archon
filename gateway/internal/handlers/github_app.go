package handlers

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// getGithubAppInstallationToken generates a GitHub App JWT, fetches the first
// installation, and exchanges it for a short-lived installation access token.
// It reads GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY from environment variables.
// GITHUB_APP_PRIVATE_KEY should be the raw PEM content (with literal \n replaced
// by actual newlines), or you can set GITHUB_APP_PRIVATE_KEY_PATH to a file path.
func getGithubAppInstallationToken(repoOwner string) (string, error) {
	appIDStr := os.Getenv("GITHUB_APP_ID")
	if appIDStr == "" {
		return "", fmt.Errorf("GITHUB_APP_ID environment variable not set")
	}
	appID, err := strconv.ParseInt(appIDStr, 10, 64)
	if err != nil {
		return "", fmt.Errorf("invalid GITHUB_APP_ID %q: %w", appIDStr, err)
	}

	privateKey, err := loadGithubAppPrivateKey()
	if err != nil {
		return "", fmt.Errorf("failed to load GitHub App private key: %w", err)
	}

	// Build a JWT valid for 60 seconds
	now := time.Now()
	claims := jwt.RegisteredClaims{
		IssuedAt:  jwt.NewNumericDate(now.Add(-30 * time.Second)), // slight back-date avoids clock skew
		ExpiresAt: jwt.NewNumericDate(now.Add(60 * time.Second)),
		Issuer:    strconv.FormatInt(appID, 10),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedJWT, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign GitHub App JWT: %w", err)
	}

	// Fetch installation ID for the given owner/org
	installationID, err := getInstallationID(signedJWT, repoOwner)
	if err != nil {
		return "", fmt.Errorf("failed to get GitHub App installation ID: %w", err)
	}

	// Exchange installation ID for an access token
	accessToken, err := getInstallationAccessToken(signedJWT, installationID)
	if err != nil {
		return "", fmt.Errorf("failed to get GitHub App installation access token: %w", err)
	}

	return accessToken, nil
}

func loadGithubAppPrivateKey() (*rsa.PrivateKey, error) {
	var pemData []byte

	// Prefer a file path if set
	if keyPath := os.Getenv("GITHUB_APP_PRIVATE_KEY_PATH"); keyPath != "" {
		data, err := os.ReadFile(keyPath)
		if err != nil {
			return nil, fmt.Errorf("reading private key file %q: %w", keyPath, err)
		}
		pemData = data
	} else {
		raw := os.Getenv("GITHUB_APP_PRIVATE_KEY")
		if raw == "" {
			return nil, fmt.Errorf("GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH must be set")
		}
		pemData = []byte(raw)
	}

	block, _ := pem.Decode(pemData)
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block from private key")
	}

	key, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8 as well
		parsed, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("failed to parse private key (PKCS1: %v, PKCS8: %v)", err, err2)
		}
		rsaKey, ok := parsed.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("private key is not an RSA key")
		}
		return rsaKey, nil
	}
	return key, nil
}

func getInstallationID(jwt, owner string) (int64, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	// First try owner-specific installation
	url := fmt.Sprintf("https://api.github.com/orgs/%s/installation", owner)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+jwt)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var result struct {
			ID int64 `json:"id"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && result.ID != 0 {
			return result.ID, nil
		}
	}

	// Try user installation
	url = fmt.Sprintf("https://api.github.com/users/%s/installation", owner)
	req2, _ := http.NewRequest("GET", url, nil)
	req2.Header.Set("Authorization", "Bearer "+jwt)
	req2.Header.Set("Accept", "application/vnd.github.v3+json")

	resp2, err := client.Do(req2)
	if err != nil {
		return 0, err
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp2.Body)
		return 0, fmt.Errorf("GitHub installation lookup returned %d: %s", resp2.StatusCode, string(body))
	}

	var result2 struct {
		ID int64 `json:"id"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&result2); err != nil {
		return 0, fmt.Errorf("failed to decode installation response: %w", err)
	}
	return result2.ID, nil
}

func getInstallationAccessToken(jwtToken string, installationID int64) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	url := fmt.Sprintf("https://api.github.com/app/installations/%d/access_tokens", installationID)

	req, _ := http.NewRequest("POST", url, nil)
	req.Header.Set("Authorization", "Bearer "+jwtToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("GitHub access token creation returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode access token response: %w", err)
	}
	if result.Token == "" {
		return "", fmt.Errorf("GitHub returned an empty access token")
	}
	return result.Token, nil
}
