export type AnalysisStatus = "completed" | "running" | "queued" | "failed";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type AnalysisType = "architecture-review" | "architecture-reconstruction" | "design-validation" | "scalability-assessment";

export interface Analysis {
  id: string;
  repo: string;
  branch: string;
  type: AnalysisType;
  status: AnalysisStatus;
  score: number;
  createdAt: string;
  completedAt?: string;
  duration?: string;
  findings: number;
  critical: number;
  agentCount: number;
}

export interface Finding {
  id: string;
  agent: string;
  title: string;
  component: string;
  file?: string;
  severity: Severity;
  status: "open" | "acknowledged" | "resolved";
  description: string;
}

export interface DriftAlert {
  id: string;
  repo: string;
  severity: Severity;
  message: string;
  component: string;
  detectedAt: string;
  driftScore: number;
}

export interface Report {
  id: string;
  repo: string;
  type: AnalysisType;
  score: number;
  generatedAt: string;
  size: string;
  version: number;
  tags: string[];
}

export const analyses: Analysis[] = [
  {
    id: "anl_01",
    repo: "acme-corp/payments-service",
    branch: "main",
    type: "architecture-review",
    status: "completed",
    score: 74,
    createdAt: "2026-06-01T10:23:00Z",
    completedAt: "2026-06-01T10:41:00Z",
    duration: "18m 04s",
    findings: 23,
    critical: 3,
    agentCount: 6,
  },
  {
    id: "anl_02",
    repo: "acme-corp/user-auth",
    branch: "feature/oauth2",
    type: "scalability-assessment",
    status: "running",
    score: 0,
    createdAt: "2026-06-02T07:10:00Z",
    findings: 0,
    critical: 0,
    agentCount: 4,
  },
  {
    id: "anl_03",
    repo: "acme-corp/data-pipeline",
    branch: "main",
    type: "design-validation",
    status: "completed",
    score: 88,
    createdAt: "2026-05-31T14:05:00Z",
    completedAt: "2026-05-31T14:28:00Z",
    duration: "23m 12s",
    findings: 11,
    critical: 0,
    agentCount: 5,
  },
  {
    id: "anl_04",
    repo: "acme-corp/api-gateway",
    branch: "main",
    type: "architecture-reconstruction",
    status: "completed",
    score: 61,
    createdAt: "2026-05-30T09:00:00Z",
    completedAt: "2026-05-30T09:34:00Z",
    duration: "34m 10s",
    findings: 31,
    critical: 5,
    agentCount: 6,
  },
  {
    id: "anl_05",
    repo: "acme-corp/notification-svc",
    branch: "main",
    type: "architecture-review",
    status: "queued",
    score: 0,
    createdAt: "2026-06-02T07:55:00Z",
    findings: 0,
    critical: 0,
    agentCount: 6,
  },
  {
    id: "anl_06",
    repo: "acme-corp/inventory-mgmt",
    branch: "release/v2.1",
    type: "scalability-assessment",
    status: "failed",
    score: 0,
    createdAt: "2026-06-01T16:00:00Z",
    completedAt: "2026-06-01T16:08:00Z",
    duration: "8m 02s",
    findings: 0,
    critical: 0,
    agentCount: 4,
  },
];

export const findings: Finding[] = [
  {
    id: "fnd_01",
    agent: "Security Agent",
    title: "JWT tokens never expire — infinite session lifetime",
    component: "AuthService",
    file: "src/auth/jwt.service.ts",
    severity: "critical",
    status: "open",
    description: "JWT tokens are issued without an expiry claim. Any leaked token grants permanent access. Set expiresIn to ≤ 15m and implement refresh-token rotation.",
  },
  {
    id: "fnd_02",
    agent: "Scalability Agent",
    title: "Synchronous DB call inside request hot-path",
    component: "OrderController",
    file: "src/orders/orders.controller.ts",
    severity: "high",
    status: "open",
    description: "Three sequential PostgreSQL queries execute on every /orders request without caching. Under load this creates a bottleneck at ~200 RPS.",
  },
  {
    id: "fnd_03",
    agent: "Database Agent",
    title: "Missing index on payments.status + created_at",
    component: "PaymentsDB",
    file: "migrations/004_payments.sql",
    severity: "high",
    status: "acknowledged",
    description: "The most common query pattern filters on (status, created_at) but no composite index exists. EXPLAIN shows sequential scans on 4.2M rows.",
  },
  {
    id: "fnd_04",
    agent: "API Design Agent",
    title: "REST endpoints return 200 on partial failure",
    component: "PaymentGatewayAdapter",
    file: "src/gateway/adapter.ts",
    severity: "medium",
    status: "open",
    description: "The /api/v1/charges endpoint returns HTTP 200 with {success: false} in the body on payment failures, violating HTTP semantics. Clients that only check status code will miss errors.",
  },
  {
    id: "fnd_05",
    agent: "Cost Agent",
    title: "Unused Lambda function incurring idle charges",
    component: "LegacyWebhookHandler",
    file: "infra/lambdas/webhook_legacy.tf",
    severity: "medium",
    status: "open",
    description: "Lambda function receiving 0 invocations/month is still deployed with 512MB memory reservation, costing ~$14/month.",
  },
  {
    id: "fnd_06",
    agent: "Security Agent",
    title: "SQL queries built via string concatenation",
    component: "ReportingService",
    file: "src/reporting/query-builder.ts",
    severity: "critical",
    status: "open",
    description: "User-supplied date range filters are interpolated directly into SQL strings. Classic SQL injection vector — switch to parameterized queries immediately.",
  },
  {
    id: "fnd_07",
    agent: "Scalability Agent",
    title: "No circuit breaker around downstream Stripe API calls",
    component: "StripeAdapter",
    file: "src/integrations/stripe/adapter.ts",
    severity: "high",
    status: "open",
    description: "If Stripe experiences degradation, all payment requests will hang until timeout (30s). Implement circuit breaker pattern with Opossum or similar.",
  },
  {
    id: "fnd_08",
    agent: "Reliability Agent",
    title: "Deployment has no health check configured",
    component: "PaymentServiceDeployment",
    file: "k8s/deployments/payments.yaml",
    severity: "medium",
    status: "resolved",
    description: "Kubernetes deployment lacks both readinessProbe and livenessProbe. Pods with crashed application logic will continue to receive traffic.",
  },
];

export const driftAlerts: DriftAlert[] = [
  {
    id: "drft_01",
    repo: "acme-corp/payments-service",
    severity: "critical",
    message: "Undocumented Redis cache layer detected — not present in architecture spec",
    component: "CacheLayer",
    detectedAt: "2026-06-02T06:45:00Z",
    driftScore: 92,
  },
  {
    id: "drft_02",
    repo: "acme-corp/api-gateway",
    severity: "high",
    message: "Direct DB connections bypassing API gateway in 3 services",
    component: "DatabaseAccess",
    detectedAt: "2026-06-01T22:10:00Z",
    driftScore: 78,
  },
  {
    id: "drft_03",
    repo: "acme-corp/user-auth",
    severity: "medium",
    message: "OAuth2 provider changed from Auth0 to Okta — integration contract updated",
    component: "AuthProvider",
    detectedAt: "2026-06-01T14:30:00Z",
    driftScore: 45,
  },
  {
    id: "drft_04",
    repo: "acme-corp/data-pipeline",
    severity: "low",
    message: "Kafka topic partition count increased from 8 to 16",
    component: "MessageBroker",
    detectedAt: "2026-05-31T18:00:00Z",
    driftScore: 20,
  },
];

export const reports: Report[] = [
  {
    id: "rpt_01",
    repo: "acme-corp/payments-service",
    type: "architecture-review",
    score: 74,
    generatedAt: "2026-06-01T10:41:00Z",
    size: "2.4 MB",
    version: 7,
    tags: ["payments", "critical-path", "PCI"],
  },
  {
    id: "rpt_02",
    repo: "acme-corp/data-pipeline",
    type: "design-validation",
    score: 88,
    generatedAt: "2026-05-31T14:28:00Z",
    size: "1.8 MB",
    version: 3,
    tags: ["kafka", "etl", "streaming"],
  },
  {
    id: "rpt_03",
    repo: "acme-corp/api-gateway",
    type: "architecture-reconstruction",
    score: 61,
    generatedAt: "2026-05-30T09:34:00Z",
    size: "3.1 MB",
    version: 2,
    tags: ["gateway", "microservices", "legacy"],
  },
  {
    id: "rpt_04",
    repo: "acme-corp/user-auth",
    type: "architecture-review",
    score: 82,
    generatedAt: "2026-05-28T11:00:00Z",
    size: "1.2 MB",
    version: 5,
    tags: ["auth", "security", "oauth2"],
  },
];

export const analyticsData = [
  { date: "May 27", analyses: 2, findings: 18, score: 71 },
  { date: "May 28", analyses: 4, findings: 34, score: 68 },
  { date: "May 29", analyses: 1, findings: 9, score: 80 },
  { date: "May 30", analyses: 3, findings: 42, score: 65 },
  { date: "May 31", analyses: 5, findings: 28, score: 72 },
  { date: "Jun 01", analyses: 6, findings: 37, score: 74 },
  { date: "Jun 02", analyses: 3, findings: 11, score: 78 },
];

export const findingsByCategory = [
  { category: "Security", count: 8, color: "#ef4444" },
  { category: "Scalability", count: 11, color: "#f59e0b" },
  { category: "Reliability", count: 6, color: "#6366f1" },
  { category: "Cost", count: 4, color: "#22c55e" },
  { category: "API Design", count: 7, color: "#3b82f6" },
  { category: "Database", count: 5, color: "#8b5cf6" },
];

export const jobTimeline = [
  { step: "Queued", status: "done", time: "07:10:00", duration: "0s" },
  { step: "Repository Clone", status: "done", time: "07:10:04", duration: "4s" },
  { step: "Dependency Graph", status: "done", time: "07:10:12", duration: "8s" },
  { step: "Code Analysis", status: "done", time: "07:12:45", duration: "2m 33s" },
  { step: "Agent Execution", status: "running", time: "07:15:00", duration: "running" },
  { step: "Report Generation", status: "pending", time: "—", duration: "—" },
  { step: "Completed", status: "pending", time: "—", duration: "—" },
];

export const agentProgress = [
  { name: "Scalability Agent", progress: 100, status: "done", findings: 5 },
  { name: "Security Agent", progress: 100, status: "done", findings: 3 },
  { name: "Database Agent", progress: 78, status: "running", findings: 2 },
  { name: "API Design Agent", progress: 45, status: "running", findings: 1 },
  { name: "Cost Agent", progress: 0, status: "pending", findings: 0 },
  { name: "Drift Detector", progress: 0, status: "pending", findings: 0 },
];

export const archNodes = [
  { id: "api-gw", label: "API Gateway", type: "service", layer: "frontend", x: 400, y: 80, health: "healthy" },
  { id: "auth-svc", label: "Auth Service", type: "service", layer: "backend", x: 180, y: 220, health: "warning" },
  { id: "payment-svc", label: "Payment Service", type: "service", layer: "backend", x: 400, y: 220, health: "critical" },
  { id: "notif-svc", label: "Notification Svc", type: "service", layer: "backend", x: 620, y: 220, health: "healthy" },
  { id: "pg-main", label: "PostgreSQL (Main)", type: "database", layer: "data", x: 250, y: 380, health: "healthy" },
  { id: "redis", label: "Redis Cache", type: "cache", layer: "data", x: 480, y: 380, health: "healthy" },
  { id: "stripe", label: "Stripe API", type: "external", layer: "external", x: 620, y: 380, health: "healthy" },
  { id: "kafka", label: "Kafka", type: "queue", layer: "data", x: 150, y: 380, health: "healthy" },
];

export const archEdges = [
  { id: "e1", source: "api-gw", target: "auth-svc", label: "REST", type: "rest" },
  { id: "e2", source: "api-gw", target: "payment-svc", label: "REST", type: "rest" },
  { id: "e3", source: "api-gw", target: "notif-svc", label: "REST", type: "rest" },
  { id: "e4", source: "payment-svc", target: "pg-main", label: "JDBC", type: "db" },
  { id: "e5", source: "payment-svc", target: "redis", label: "Cache", type: "cache" },
  { id: "e6", source: "payment-svc", target: "stripe", label: "HTTPS", type: "external" },
  { id: "e7", source: "notif-svc", target: "kafka", label: "Produce", type: "async" },
  { id: "e8", source: "auth-svc", target: "redis", label: "Sessions", type: "cache" },
];

export const mermaidDiagram = `graph TD
    A[API Gateway] -->|REST| B[Auth Service]
    A -->|REST| C[Payment Service]
    A -->|REST| D[Notification Svc]
    C -->|JDBC| E[(PostgreSQL)]
    C -->|Cache| F[(Redis)]
    C -->|HTTPS| G[Stripe API]
    D -->|Produce| H{{Kafka}}
    B -->|Sessions| F
    style A fill:#6366f1,stroke:#818cf8,color:#fff
    style C fill:#ef4444,stroke:#f87171,color:#fff
    style B fill:#f59e0b,stroke:#fbbf24,color:#fff
    style D fill:#22c55e,stroke:#4ade80,color:#fff
    style E fill:#1e293b,stroke:#475569,color:#94a3b8
    style F fill:#1e293b,stroke:#475569,color:#94a3b8
    style G fill:#0f172a,stroke:#334155,color:#94a3b8
    style H fill:#1e293b,stroke:#475569,color:#94a3b8`;

export const scoreBreakdown = {
  overall: 74,
  scalability: 68,
  reliability: 72,
  security: 55,
  cost: 81,
  apiDesign: 79,
};

export const driftComparison = {
  expected: [
    { component: "API Gateway", expected: "Kong v3.x", actual: "Kong v3.x", drift: "none" },
    { component: "Auth Provider", expected: "Auth0", actual: "Okta", drift: "changed" },
    { component: "Cache Layer", expected: "Not specified", actual: "Redis 7.2", drift: "added" },
    { component: "DB Pool Size", expected: "max: 20", actual: "max: 100", drift: "changed" },
    { component: "Message Broker", expected: "RabbitMQ", actual: "Kafka", drift: "changed" },
    { component: "CDN", expected: "CloudFront", actual: "CloudFront", drift: "none" },
    { component: "Service Mesh", expected: "Istio", actual: "Not deployed", drift: "removed" },
  ],
  driftScore: 67,
  driftSeverity: "high" as Severity,
};

// Rich Staff-Engineer Level System Design Specifications for the Workspace IDE
export const systemRequirements = {
  functional: [
    "Perform asynchronous repository structure analysis and auto-generate graph nodes.",
    "Support standard local PostgreSQL pgx schema validations with direct warning logs.",
    "Auto-evaluate scalability workloads reaching 10,000+ RPS under peak stress scenarios.",
    "Map security boundaries, catching raw token leaks, CORS vulnerabilities, and CORS wildcard setups."
  ],
  nonFunctional: [
    "Workspace dashboard interface must load in less than 200ms using local HSL glows.",
    "Analysis bootstrapping pipeline runs asynchronously, never blocking client operations.",
    "All REST calls secure bearer authorization mappings strictly restricting project scope owners.",
    "Scale estimation engine operates securely offline with fully local Redis/Postgres socket connections."
  ],
  constraints: [
    "Zero SQLite fallbacks allowed on production gateway database modules.",
    "Main PostgreSQL tables require indexed, strict partitioning for historical analyses entries.",
    "CORS rules enforce explicit domains mapping, preventing global '*' wildcard access."
  ],
  assumptions: [
    "Average payload size per workspace analysis contains ≤ 50 critical findings entries.",
    "Go Gateway REST service runs reliably on port 8080 locally.",
    "Developers complete signup & credentials tokenization prior to workspace setups."
  ],
  openQuestions: [
    "Should we stream analysis compilation logs in real time via standard gRPC web sockets?",
    "Will secondary read replicas be provisioned dynamically on the cost-agent calculator module?"
  ]
};

export const capacitySpecs = {
  dau: "1.2 Million Active Developers",
  peakQps: "8,500 requests/sec",
  storage: "450 GB / month raw telemetry logs",
  bandwidth: "120 Mbps Ingress / 480 Mbps Egress",
  growth: [
    "8.5% MoM expansion on active workspace registrations",
    "Estimated peak load surge (+250% QPS) during global release cycles"
  ]
};

export const databaseSchema = {
  recommendation: "PostgreSQL 15+ Cluster with Redis Active Caching",
  indexing: [
    "CREATE INDEX idx_analyses_project_id ON analyses(project_id); -- Resolved sequential scans on 4.2M rows",
    "CREATE INDEX idx_findings_analysis_id ON findings(analysis_id); -- Speeds up accordion panels lookup",
    "CREATE UNIQUE INDEX idx_users_email ON users(email); -- Speeds up JWT login queries"
  ],
  partitioning: "Partition Table `analyses` by Range on `created_at` (Yearly buckets)",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique identifier for developer accounts" },
        { name: "email", type: "VARCHAR(255)", desc: "Unique account email, indexed for credentials lookups" },
        { name: "password_hash", type: "VARCHAR(255)", desc: "Bcrypt hash, checked during gateway session signing" },
        { name: "created_at", type: "TIMESTAMP", desc: "Creation date record" }
      ]
    },
    {
      name: "projects",
      columns: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique identifier for workspaces" },
        { name: "name", type: "VARCHAR(255)", desc: "Human readable project namespace" },
        { name: "repo_url", type: "VARCHAR(255)", desc: "Target repository repository path" },
        { name: "branch", type: "VARCHAR(64)", desc: "Default tracking branch (e.g. main)" },
        { name: "owner_id", type: "UUID (Foreign Key)", desc: "Maps ownership back to users.id context" }
      ]
    },
    {
      name: "analyses",
      columns: [
        { name: "id", type: "UUID (Primary Key)", desc: "Unique identifier for runs" },
        { name: "project_id", type: "UUID (Foreign Key)", desc: "Maps back to projects.id context" },
        { name: "status", type: "VARCHAR(32)", desc: "Active run state (running, completed, failed)" },
        { name: "score", type: "INTEGER", desc: "Overall calculated architectural baseline rating (0-100)" },
        { name: "duration", type: "VARCHAR(64)", desc: "Total execution run time (e.g. 18m 04s)" }
      ]
    }
  ],
  relationships: [
    "users.id ──(1:N)──> projects.owner_id",
    "projects.id ──(1:N)──> analyses.project_id",
    "analyses.id ──(1:N)──> findings.analysis_id"
  ]
};

export const apiSpecs = {
  rest: [
    { method: "POST", path: "/api/v1/auth/signup", desc: "Register a secure developer account with password hashing." },
    { method: "POST", path: "/api/v1/auth/login", desc: "Authenticate credentials, returning cryptographic Bearer JWT." },
    { method: "POST", path: "/api/v1/projects", desc: "Register workspace codebases under secure Owner authorization context." },
    { method: "POST", path: "/api/v1/projects/{id}/analyses", desc: "Trigger an asynchronous baseline architecture review run." },
    { method: "GET", path: "/api/v1/analyses/{id}", desc: "Fetch real-time analysis scores, findings, and timeline records." }
  ],
  grpc: `// Archon Core Intelligence Inter-Service Contract
syntax = "proto3";
package archon.ai.v1;

service IntelligenceAgentService {
  rpc RunArchitectureReview (ReviewRequest) returns (ReviewResponse);
  rpc StreamDriftDetections (DriftRequest) returns (stream DriftEvent);
}

message ReviewRequest {
  string project_id = 1;
  string repo_url = 2;
  string active_branch = 3;
  repeated string enabled_agents = 4;
}

message ReviewResponse {
  string analysis_id = 1;
  int32 overall_score = 2;
  repeated DiagnosticFinding findings = 3;
  string generated_spec_schema = 4;
}`
};

export const costBreakdown = {
  monthlyEstimate: "$2,850 - $4,200 USD / month",
  drivers: [
    { service: "PostgreSQL Database Cluster (AWS RDS db.t4g.xlarge)", cost: "$820/mo", detail: "Primary transactional cluster with read-replicas enabled" },
    { service: "Redis Active In-Memory Cache (ElastiCache)", cost: "$440/mo", detail: "Active session sync mapping developer authentication tokens" },
    { service: "Object Storage (AWS S3 Backup Log telemetry)", cost: "$290/mo", detail: "Large history logs collection storage" },
    { service: "LLM Orchestration Token pools", cost: "$1,300/mo", detail: "Dynamic AI agent execution tokens" }
  ],
  optimizations: [
    "Enforce lifecycle policies on telemetry log storage bucket (S3 Glacier transition after 14 days).",
    "Configure auto-scaling groups on Go REST gateways to down-scale replicas during off-hours.",
    "Consolidate developer JWT checks inside cached Redis session tokens, removing sequential DB hits."
  ]
};

export const tradeoffsCompare = {
  title: "Primary Storage Engine: PostgreSQL vs. Apache Cassandra",
  prosCons: [
    {
      engine: "PostgreSQL (Selected)",
      pros: [
        "Strong ACID guarantees, critical for project workspace states and user accounts registries.",
        "Rich standard relational querying, support composite indexing, and pgx driver compatibility.",
        "Excellent support for transactional multi-table integrity."
      ],
      cons: [
        "Vertical scaling constraints on single master setup under heavy load.",
        "Schema migrations require careful orchestration to prevent locking active tables."
      ],
      decision: "Selected as primary platform data store due to strict authorization validation dependencies and relational metadata structures."
    },
    {
      engine: "Apache Cassandra (Alternative)",
      pros: [
        "Flawless horizontal scaling with linear throughput expansion across massive partition clusters.",
        "Highly resilient with zero single points of failure natively."
      ],
      cons: [
        "Lack of standard transactional multi-table integrity (no native joins).",
        "Requires highly optimized, query-first schema design layouts, introducing setup overhead."
      ],
      decision: "Rejected for core platform state, but recommended as an excellent secondary store for streaming agent telemetry logs."
    }
  ]
};

