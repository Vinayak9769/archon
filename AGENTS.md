<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Overview

Archon is an AI-powered system design platform.

Users provide:

* Product ideas
* Product Requirements Documents (PRDs)
* Business requirements
* Functional requirements
* Scale requirements

The platform generates:

* Requirement analysis
* Capacity estimates
* Architecture designs
* Database schemas
* API contracts
* Infrastructure recommendations
* Tradeoff analysis

The system is built around a collection of specialized AI agents coordinated through workflow orchestration.

---

# Design Workflow

```text
User Requirements
        │
        ▼

Requirements Agent
        │
        ▼

Capacity Planning Agent
        │
        ▼

Architecture Agent
        │
        ▼

 ┌───────────────┬───────────────┬───────────────┐
 │               │               │               │
 ▼               ▼               ▼               ▼

Database     API Design     Security      Reliability
 Agent          Agent         Agent          Agent

        │
        ▼

Tradeoff Agent
        │
        ▼

Report Generator
```

---

# Agent Principles

Every agent must:

1. Operate within a clearly defined scope.
2. Produce structured outputs.
3. Avoid assumptions without justification.
4. Reference design decisions explicitly.
5. Pass artifacts to downstream agents.

Agents do not communicate directly.

All communication occurs through workflow state.

---

# Requirements Agent

## Responsibilities

Transform user input into a structured requirements document.

Input:

* Product description
* PRD
* User prompt

Output:

* Functional requirements
* Non-functional requirements
* Constraints
* Assumptions
* Open questions

Example:

Input:

```text
Build a ride sharing platform similar to Uber.
```

Output:

```text
Functional Requirements
- Driver matching
- Real-time tracking
- Payments

Non Functional Requirements
- 99.99% availability
- <200ms API latency
```

---

# Capacity Planning Agent

## Responsibilities

Estimate scale requirements.

Input:

* Requirements document

Output:

* DAU estimates
* QPS estimates
* Storage estimates
* Bandwidth estimates
* Peak traffic assumptions

Example:

```text
10M DAU

Peak QPS: 25,000

Storage:
2 TB/day
```

---

# Architecture Agent

## Responsibilities

Generate high-level architecture.

Input:

* Requirements
* Capacity estimates

Output:

* Service decomposition
* Data flow
* System diagram
* Infrastructure components

Example:

```text
Client
    ↓

API Gateway
    ↓

User Service
Order Service
Search Service
```

This agent owns the primary system architecture.

---

# Database Agent

## Responsibilities

Design storage systems.

Input:

* Requirements
* Architecture

Output:

* Database selection
* Schema recommendations
* Partitioning strategy
* Indexing recommendations
* Data lifecycle strategy

Example:

```text
Users Table
Orders Table
Drivers Table

Primary Database:
PostgreSQL

Caching:
Redis
```

---

# API Design Agent

## Responsibilities

Generate service interfaces.

Input:

* Architecture
* Domain entities

Output:

* REST endpoints
* gRPC contracts
* Request/response models
* API versioning recommendations

Example:

```http
POST /orders

GET /orders/{id}
```

---

# Reliability Agent

## Responsibilities

Review architecture for reliability.

Input:

* Architecture design

Output:

* Availability concerns
* Failure scenarios
* Recovery mechanisms
* SLA recommendations

Example:

```text
Single database instance detected.

Recommendation:
Add read replicas.
```

---

# Security Agent

## Responsibilities

Review architecture for security concerns.

Input:

* Architecture design

Output:

* Threat model
* Authentication recommendations
* Authorization recommendations
* Secret management recommendations

Example:

```text
JWT Authentication

RBAC Authorization

Secret Manager Integration
```

---

# Cost Agent

## Responsibilities

Estimate infrastructure costs.

Input:

* Capacity estimates
* Architecture

Output:

* Infrastructure cost ranges
* Major cost drivers
* Cost optimization opportunities

Example:

```text
Monthly Estimate:
$4,000 - $7,000

Largest Cost:
Object Storage
```

---

# Tradeoff Agent

## Responsibilities

Evaluate alternative approaches.

Input:

* Architecture design
* Database design
* Infrastructure decisions

Output:

* Alternative designs
* Pros and cons
* Design rationale

Example:

```text
PostgreSQL

Pros:
- Strong consistency
- Mature ecosystem

Cons:
- Vertical scaling limitations

Alternative:
Cassandra
```

---

# Report Generator

## Responsibilities

Generate final deliverables.

Input:

* Outputs from all agents

Output:

* Architecture report
* System diagram
* Capacity analysis
* Database design
* API design
* Security review
* Reliability review
* Tradeoff analysis

This is the final user-facing artifact.

---

# Future Agents

Potential future additions:

* Caching Agent
* Event-Driven Architecture Agent
* Microservices Agent
* Kubernetes Agent
* Observability Agent
* Data Engineering Agent
* AI Infrastructure Agent

---

# Service Boundaries

## Go Platform Layer

Responsibilities:

* Authentication
* Projects
* Workflow creation
* Report storage
* User management
* API layer

Must not contain AI logic.

---

## Python Intelligence Layer

Responsibilities:

* Agent execution
* Prompt orchestration
* RAG
* Evaluation
* Architecture generation

Must not contain platform concerns.

---

# Workflow Execution

Long-running design workflows should be executed asynchronously.

Example:

```text
Create Design Request
        ↓

Requirements Analysis
        ↓

Capacity Planning
        ↓

Architecture Generation
        ↓

Parallel Agent Execution
        ↓

Report Assembly
        ↓

Persist Results
```

Workflow state must be durable and resumable.

```
```

