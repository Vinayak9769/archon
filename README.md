# Archon — AI-Powered System Design Platform

Archon is an AI-orchestrated platform designed to automatically analyze product ideas, scale capacity, decompose services, generate database schemas, design API contracts, and perform reliability/security reviews.

It features a **Live Reviews Dashboard** that integrates with GitHub to inspect pull requests, read CI status checks, post review comments, assign reviewers, submit approvals/changes-requested, and merge code.

---

## Capabilities

Archon coordinates a sequence of specialized AI agents through a shared workflow state:

| Agent | Responsibility | Core Output |
| :--- | :--- | :--- |
| **Requirements Agent** | Evaluates PRDs & ideas | Functional/Non-functional specs, constraints, assumptions |
| **Capacity Planning** | Computes scale demands | Daily Active Users (DAU), peak QPS, storage & bandwidth estimates |
| **Architecture Agent** | Defines system blueprints | Service decomposition, data flow, component mapping |
| **Database Agent** | Designs persistence layer | Engine choice (e.g. Postgres vs NoSQL), schema, indexes, partitioning |
| **API Design Agent** | Standardizes communications | REST endpoints, request/response models, gRPC proto definitions |
| **Security Agent** | Hardens system model | Threat vectors, authorization schemes (RBAC/JWT), secret storage |
| **Reliability Agent** | Targets resilience | Redundancy, failover mechanics, read/write replicas, SLA proposals |
| **Cost Agent** | Forecasts cloud spend | Infrastructure estimates, driver breakdown, optimization paths |
| **Tradeoff Agent** | Reviews design choices | Pros/cons of alternative databases, storage, and frameworks |
| **Report Generator** | Aggregates all outputs | Cohesive system design blueprint document |
| **PR Reviews** | Integrates with GitHub | Unified code diff view, interactive comment threads, reviewer assignments, CI status checks, approval submittals, and squash-merges |

---

## Project Structure

Archon is built in a modern, decoupled architecture:
- **`gateway/`**: Written in **Go (Golang)**. Handles platform concerns including users, authentication, database storage, GitHub App integration, and gRPC orchestration.
- **`ai-service/`**: Written in **Python**. Handles AI generation workflows, LLM prompting (Gemini/OpenAI/Groq), RAG pipelines, and export formatting.
- **`frontend/`**: Written in **Next.js (TypeScript)** with custom styling, featuring workspace boards, interactive chat assistants, visual database diagrams, and the PR Reviews terminal.

---

## Environment Configuration

### 1. Gateway Backend (`gateway/.env`)
Create a `.env` file in the `gateway` directory:
```ini
# Core Gateway Settings
PORT=8080
DATABASE_URL=postgres://postgres:secure_password@localhost:5432/archon?sslmode=disable
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-super-secure-jwt-signing-secret-key-here
AI_SERVICE_URL=localhost:50051

# Frontend Redirect Link
FRONTEND_URL=http://localhost:3000

# GitHub App Integration
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_REDIRECT_URI=http://localhost:8080/api/v1/auth/callback/github
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_SLUG=your-github-app-slug
GITHUB_APP_PRIVATE_KEY_PATH=path/to/private-key.pem
# Alternatively, pass private key content directly:
# GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### 2. Python AI Service (`ai-service/.env`)
Create a `.env` file in the `ai-service` directory:
```ini
# Core AI Orchestration Config
DEFAULT_PROVIDER=gemini # Choices: gemini, openai, groq

# LLM Providers Keys
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
OPENAI_API_KEY=sk-proj-YourOpenAIApiKeyHere
OPENAI_BASE_URL=https://api.openai.com/v1 # Or custom base url (e.g. Groq, OpenRouter)
```

### 3. Next.js Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend` directory:
```ini
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## Local Development Guide

### Prerequisites
- Go 1.21+
- Python 3.10+
- Node.js 18+
- PostgreSQL & Redis

### Step 1: Initialize Database & Schema
Ensure PostgreSQL is running, create a database named `archon`, and apply migrations:
```bash
cd gateway
# Migrations are applied automatically when the gateway starts
```

### Step 2: Start Python AI Service
Create a virtual environment, install dependencies, and run the gRPC server:
```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
# Server starts on port 50051
```

### Step 3: Run the Gateway Backend
```bash
cd gateway
go run cmd/server/main.go
# Server starts on port 8080
```

### Step 4: Run the Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## Deployment Guide (DigitalOcean)

You can deploy Archon on DigitalOcean using either **DigitalOcean App Platform** (fully managed PaaS) or **DigitalOcean Droplets** (virtual machines via Docker Compose).

---

### Option A: DigitalOcean App Platform (Recommended)

App Platform is the simplest way to deploy. It automatically builds Dockerfiles and manages SSL certificates.

#### 1. Add PostgreSQL & Redis Databases
- Go to **Databases** in the DigitalOcean console and create a **Managed PostgreSQL Database**.
- Create a **Managed Redis** database instance.
- In the connection details, note down the URLs.

#### 2. Create the App
- In the DigitalOcean dashboard, select **Apps** → **Create App**.
- Link your GitHub repository.
- DigitalOcean will detect three components (Gateway, AI Service, Frontend).

#### 3. Configure Components
Configure each component with the following settings:

* **Gateway Service (Go)**:
  - **Source Directory**: `/gateway`
  - **HTTP Port**: `8080`
  - **Environment Variables**:
    - `DATABASE_URL`: `${db.DATABASE_URL}` (bind to your managed Postgres resource)
    - `REDIS_URL`: `${redis.REDIS_URL}` (bind to your managed Redis resource)
    - `JWT_SECRET`: Generate a secure random string.
    - `AI_SERVICE_URL`: `localhost:50051` (if run as internal service) or the internal address of your AI Service component.
    - `FRONTEND_URL`: URL of your Frontend App Platform component.
    - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: Your GitHub App credentials.
    - `GITHUB_APP_ID` & `GITHUB_APP_PRIVATE_KEY`: Credentials for GitHub operations.

* **AI Service (Python gRPC)**:
  - **Source Directory**: `/ai-service`
  - **Service Type**: Internal Service (no public HTTP routing needed, communicate via gRPC port `50051`).
  - **Environment Variables**:
    - `DEFAULT_PROVIDER`: `gemini` or `openai`
    - `GEMINI_API_KEY` / `OPENAI_API_KEY`: Secrets for LLM execution.

* **Frontend Component (Next.js)**:
  - **Source Directory**: `/frontend`
  - **HTTP Port**: `3000`
  - **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: Public domain URL of your Gateway service (e.g. `https://archon-gateway-xxxx.ondigitalocean.app`).

---

### Option B: DigitalOcean Droplets (Docker Compose)

For maximum resource control and cost-efficiency, you can deploy the complete stack onto a single Droplet.

#### 1. Set Up Droplet
- Provision a basic Ubuntu Droplet (2 vCPUs, 4GB RAM recommended).
- Install Docker and Docker Compose:
  ```bash
  sudo apt update
  sudo apt install -y docker.io docker-compose
  ```

#### 2. Deploy Code & Configurations
- Clone the repository to the Droplet.
- Populate `gateway/.env` and `ai-service/.env` as shown in the **Environment Configuration** section.
- Set `NEXT_PUBLIC_API_URL` to `http://<your_droplet_ip>:8080` in `frontend/Dockerfile` (or build-args).

#### 3. Start the Containers
Run Docker Compose in detached mode:
```bash
docker-compose up -d --build
```
This starts:
- PostgreSQL database on port `5432`
- Redis cache on port `6379`
- AI Service gRPC listener internally on port `50051`
- Gateway HTTP backend on port `8080`
- Next.js web application on port `3000`

---

## GitHub App Configuration

To support bidirectional PR reviews, create a GitHub App in your organization settings:

1. **Homepage URL**: Set to your website URL.
2. **Callback URL**: `https://yourdomain.com/api/v1/auth/callback/github`
3. **Setup URL**: Set to your settings installation page.
4. **Permissions**:
   - **Repository Content**: Read & Write (to fetch files and merge PRs).
   - **Pull Requests**: Read & Write (to write comments and requested reviewers).
   - **Checks**: Read (to fetch CI build statuses).
5. **Private Key**: Generate a Private Key, download the `.pem` file, place it in the gateway directory, and configure `GITHUB_APP_PRIVATE_KEY_PATH` in your gateway env.
