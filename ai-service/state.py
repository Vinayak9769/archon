from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field
from enum import Enum

class FindingSeverity(str, Enum):
    BLOCKER = "BLOCKER"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class WorkflowStatus(str, Enum):
    VALIDATING = "validating"
    CLARIFYING = "clarifying"
    BUILDING_CPM = "building_cpm"
    AWAITING_CPM_APPROVAL = "awaiting_cpm_approval"
    GENERATING_REQUIREMENTS = "generating_requirements"
    AWAITING_REQUIREMENTS_APPROVAL = "awaiting_requirements_approval"
    BUILDING_ARCHITECTURE = "building_architecture"
    AWAITING_ARCHITECTURE_APPROVAL = "awaiting_architecture_approval"
    BUILDING_DATABASE = "building_database"
    AWAITING_DATABASE_APPROVAL = "awaiting_database_approval"
    BUILDING_API = "building_api"
    AWAITING_API_APPROVAL = "awaiting_api_approval"
    COMPLETED = "completed"

class ProjectModel(BaseModel):
    actors: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    user_stories: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    relationships: List[str] = Field(default_factory=list)
    integrations: List[str] = Field(default_factory=list)
    functional_requirements: List[str] = Field(default_factory=list)
    non_functional_requirements: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)

# Architecture Support Domain Models
class Service(BaseModel):
    name: str = Field(description="Name of the service.")
    responsibilities: List[str] = Field(default_factory=list, description="Responsibilities of the service.")
    technology_stack: List[str] = Field(default_factory=list, description="Technology choices for this service.")

class Datastore(BaseModel):
    name: str = Field(description="Name of the datastore.")
    type: str = Field(description="Type of the datastore (e.g. Relational, Key-Value, Document store).")
    technology: str = Field(description="Recommended technology choice (e.g. PostgreSQL, Redis, DynamoDB).")
    justification: str = Field(description="Why this datastore/technology is recommended.")

class Integration(BaseModel):
    name: str = Field(description="Name of the external integration.")
    type: str = Field(description="Type/purpose of the integration.")
    protocol_api: str = Field(description="API or protocol used (e.g. REST, gRPC, Webhooks).")

class Queue(BaseModel):
    name: str = Field(description="Name of the queue/topic.")
    producer: str = Field(description="Service that produces to this queue.")
    consumer: str = Field(description="Service that consumes from this queue.")
    purpose: str = Field(description="Purpose of async messaging here.")

class SecurityModel(BaseModel):
    authentication: str = Field(description="Authentication mechanism.")
    authorization: str = Field(description="Authorization strategy (e.g. RBAC, ABAC).")
    data_protection: List[str] = Field(default_factory=list, description="Data protection/encryption mechanisms at rest/in transit.")

class ScalabilityModel(BaseModel):
    scaling_strategy: str = Field(description="Scaling strategy (e.g. horizontal, vertical scaling).")
    caching_strategy: str = Field(description="Caching layers and policies.")
    bottlenecks: List[str] = Field(default_factory=list, description="Potential performance bottlenecks.")

class ArchitectureModel(BaseModel):
    architecture_pattern: str = Field(description="Recommended architecture pattern (e.g., modular_monolith, microservices, serverless).")
    services: List[Service] = Field(default_factory=list, description="Identified services.")
    datastores: List[Datastore] = Field(default_factory=list, description="Identified datastores.")
    external_integrations: List[Integration] = Field(default_factory=list, description="Identified external integrations.")
    queues: List[Queue] = Field(default_factory=list, description="Identified message queues/topics.")
    security: SecurityModel = Field(description="Security architecture details.")
    scalability: ScalabilityModel = Field(description="Scalability and caching characteristics.")
    system_diagram: str = Field(default="", description="Mermaid diagram showing connections between services, datastores, and queues.")
    score: int = Field(default=100, description="Overall validation score.")
    errors: List["ArchitectureValidationErrorWarning"] = Field(default_factory=list, description="List of blocking validation errors.")
    warnings: List["ArchitectureValidationErrorWarning"] = Field(default_factory=list, description="List of non-blocking validation warnings.")
    recommendations: List["ArchitectureValidationRecommendation"] = Field(default_factory=list, description="Recommendations for design improvement.")
    resolved_findings: List[str] = Field(default_factory=list, description="Findings that were auto-repaired during validation-repair loop.")

# Architecture Validation Domain Models
class ArchitectureValidationErrorWarning(BaseModel):
    type: str = Field(description="Type/category of the error or warning.")
    message: str = Field(description="Detailed error or warning message.")
    affected_item: str = Field(description="Name of the affected item.")
    severity: str = Field(default="MEDIUM", description="Severity: BLOCKER, HIGH, MEDIUM, LOW, INFO.")

class ArchitectureValidationRecommendation(BaseModel):
    message: str = Field(description="Recommendation description.")

class ArchitectureValidationResult(BaseModel):
    is_valid: bool = Field(description="True if errors list is empty, False otherwise.")
    score: int = Field(description="Validation score from 0 to 100.")
    errors: List[ArchitectureValidationErrorWarning] = Field(default_factory=list, description="List of blocking errors.")
    warnings: List[ArchitectureValidationErrorWarning] = Field(default_factory=list, description="List of non-blocking warnings.")
    recommendations: List[ArchitectureValidationRecommendation] = Field(default_factory=list, description="Recommendations for design improvement.")

# Database Support Domain Models
class Column(BaseModel):
    name: str = Field(description="Name of the column.")
    type: str = Field(description="Data type of the column.")
    nullable: bool = Field(default=True, description="Whether the column can be null.")
    unique: bool = Field(default=False, description="Whether the column must be unique.")
    primary_key: bool = Field(default=False, description="Whether the column is a primary key.")
    description: str = Field(description="Description of the column's purpose.")

class Constraint(BaseModel):
    name: str = Field(description="Name of the constraint.")
    type: str = Field(description="Type of the constraint (e.g. check, foreign_key, unique).")
    definition: str = Field(description="Constraint definition or rule.")

class Table(BaseModel):
    name: str = Field(description="Name of the table.")
    description: str = Field(description="Description of the table's purpose.")
    columns: List[Column] = Field(default_factory=list, description="Columns belonging to this table.")
    constraints: List[Constraint] = Field(default_factory=list, description="Constraints applied to this table.")

class RelationshipType(str, Enum):
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_MANY = "many_to_many"

class Relationship(BaseModel):
    source_table: str = Field(description="Name of the source table.")
    target_table: str = Field(description="Name of the target table.")
    relationship_type: RelationshipType = Field(description="Type of relationship.")
    description: str = Field(description="Description of the relationship.")

class Index(BaseModel):
    table: str = Field(description="Table name the index is applied to.")
    columns: List[str] = Field(default_factory=list, description="Columns covered by the index.")
    reason: str = Field(description="Reason/justification for creating this index.")

class DatabaseModel(BaseModel):
    tables: List[Table] = Field(default_factory=list, description="Tables in the database schema.")
    relationships: List[Relationship] = Field(default_factory=list, description="Relationships between tables.")
    indexes: List[Index] = Field(default_factory=list, description="Database indexes.")
    score: int = Field(default=100, description="Overall database validation score.")
    errors: List["DatabaseValidationErrorWarning"] = Field(default_factory=list, description="List of database validation errors.")
    warnings: List["DatabaseValidationErrorWarning"] = Field(default_factory=list, description="List of database validation warnings.")
    recommendations: List["DatabaseValidationRecommendation"] = Field(default_factory=list, description="Recommendations for schema improvement.")
    resolved_findings: List[str] = Field(default_factory=list, description="Findings that were auto-repaired during validation-repair loop.")

# Database Validation Domain Models
class DatabaseValidationErrorWarning(BaseModel):
    type: str = Field(description="Type/category of the error or warning.")
    message: str = Field(description="Detailed error or warning message.")
    affected_item: str = Field(description="Name of the affected item.")
    severity: str = Field(default="MEDIUM", description="Severity: BLOCKER, HIGH, MEDIUM, LOW, INFO.")

class DatabaseValidationRecommendation(BaseModel):
    message: str = Field(description="Recommendation description.")

class DatabaseValidationResult(BaseModel):
    is_valid: bool = Field(description="True if errors list is empty, False otherwise.")
    score: int = Field(description="Validation score from 0 to 100.")
    errors: List[DatabaseValidationErrorWarning] = Field(default_factory=list, description="List of blocking errors.")
    warnings: List[DatabaseValidationErrorWarning] = Field(default_factory=list, description="List of non-blocking warnings.")
    recommendations: List[DatabaseValidationRecommendation] = Field(default_factory=list, description="Recommendations for schema improvement.")

# OpenAPI Generation Domain Models
class RequestSchema(BaseModel):
    name: str = Field(default="", description="Name of the request schema.")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Properties of the request body (field name to type/description).")
    required: List[str] = Field(default_factory=list, description="List of required field names.")

class ResponseSchema(BaseModel):
    name: str = Field(default="", description="Name of the response schema.")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Properties of the response body (field name to type/description).")

class Parameter(BaseModel):
    name: str = Field(description="Name of the parameter.")
    in_type: str = Field(description="Location of the parameter (e.g., path, query, header).")
    required: bool = Field(default=True, description="Whether the parameter is required.")
    type: str = Field(description="Data type of the parameter.")
    description: Optional[str] = Field(default=None, description="Description of the parameter.")

class Endpoint(BaseModel):
    path: str = Field(description="API endpoint path (e.g., /users/{id}).")
    method: str = Field(description="HTTP method (GET, POST, PUT, PATCH, DELETE).")
    summary: str = Field(description="Summary of endpoint purpose.")
    service: str = Field(description="Owner service name.")
    request_schema: Optional[RequestSchema] = Field(default=None, description="Request body schema if applicable.")
    response_schema: Optional[ResponseSchema] = Field(default=None, description="Response body schema if applicable.")
    parameters: List[Parameter] = Field(default_factory=list, description="Path or query parameters.")
    authentication_required: bool = Field(default=False, description="True if auth is required.")
    request_body: Optional[str] = Field(default=None, description="A formatted JSON string representing an example request payload.")
    response_body: Optional[str] = Field(default=None, description="A formatted JSON string representing an example response payload.")

class OpenAPIModel(BaseModel):
    endpoints: List[Endpoint] = Field(default_factory=list, description="List of API endpoints.")
    score: int = Field(default=100, description="Overall API validation score.")
    errors: List["OpenAPIValidationErrorWarning"] = Field(default_factory=list, description="List of API validation errors.")
    warnings: List["OpenAPIValidationErrorWarning"] = Field(default_factory=list, description="List of API validation warnings.")
    recommendations: List["OpenAPIValidationRecommendation"] = Field(default_factory=list, description="Recommendations for API specification improvement.")
    resolved_findings: List[str] = Field(default_factory=list, description="Findings that were auto-repaired during validation-repair loop.")

# OpenAPI Validation Domain Models
class OpenAPIValidationErrorWarning(BaseModel):
    type: str = Field(description="Type/category of the error or warning.")
    message: str = Field(description="Detailed error or warning message.")
    affected_item: str = Field(description="Name of the affected item.")
    severity: str = Field(default="MEDIUM", description="Severity: BLOCKER, HIGH, MEDIUM, LOW, INFO.")

class OpenAPIValidationRecommendation(BaseModel):
    message: str = Field(description="Recommendation description.")

class OpenAPIValidationResult(BaseModel):
    is_valid: bool = Field(description="True if errors list is empty, False otherwise.")
    score: int = Field(description="Validation score from 0 to 100.")
    errors: List[OpenAPIValidationErrorWarning] = Field(default_factory=list, description="List of blocking errors.")
    warnings: List[OpenAPIValidationErrorWarning] = Field(default_factory=list, description="List of non-blocking warnings.")
    recommendations: List[OpenAPIValidationRecommendation] = Field(default_factory=list, description="Recommendations for OpenAPI specification improvement.")

# Implementation Backlog Domain Models
class TaskCategory(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    INFRASTRUCTURE = "infrastructure"
    TESTING = "testing"

class TaskComplexity(str, Enum):
    XS = "XS"
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"

class ImplementationTask(BaseModel):
    title: str = Field(description="Concise task title.")
    description: str = Field(description="Detailed description of the work to be done.")
    category: str = Field(description="Category: backend, frontend, database, infrastructure, or testing.")
    estimated_complexity: str = Field(description="Complexity estimate: XS, S, M, L, or XL.")
    dependencies: List[str] = Field(default_factory=list, description="Titles of tasks this depends on.")

class Story(BaseModel):
    name: str = Field(description="User story name.")
    description: str = Field(description="Description of the user workflow or scenario.")
    tasks: List[ImplementationTask] = Field(default_factory=list, description="Implementation tasks for this story.")

class Epic(BaseModel):
    name: str = Field(description="Epic name representing a major feature area.")
    description: str = Field(description="Description of the epic's scope and purpose.")
    stories: List[Story] = Field(default_factory=list, description="User stories within this epic.")

class ImplementationBacklog(BaseModel):
    epics: List[Epic] = Field(default_factory=list, description="List of epics forming the implementation backlog.")

class WorkflowState(TypedDict):
    # Inputs
    prd: str
    provider: str  # "openai" or "gemini"
    model: Optional[str]
    
    # Canonical Project Model (CPM)
    project_model: Optional[ProjectModel]
    cpm_approved: Optional[bool]
    cpm_feedback: Optional[str]
    
    # Validation & Clarification HITL
    validation_status: str  # "pending", "incomplete", "valid"
    validation_findings: Optional[Any]
    validation_questions: List[str]
    clarification_responses: Dict[str, str]  # question -> answer
    
    # Requirements & Approval HITL
    requirements_doc: Optional[str]
    approved: Optional[bool]
    approval_feedback: Optional[str]
    
    # Intervention HITL
    intervention_requested: bool
    intervention_log: List[str]
    
    # General execution status
    status: WorkflowStatus
    
    # Requirements Extraction Output
    extracted_requirements: Optional[Any]
    
    # Clarification Planner Output
    clarifications: Optional[Any]
    
    # Architecture Support
    architecture_model: Optional[ArchitectureModel]
    architecture_feedback: Optional[str]
    architecture_approved: Optional[bool]
    
    # Database Support
    database_model: Optional[DatabaseModel]
    database_feedback: Optional[str]
    database_approved: Optional[bool]
    
    # API / OpenAPI Support
    openapi_model: Optional[OpenAPIModel]
    api_feedback: Optional[str]
    api_approved: Optional[bool]
    
    # Implementation Backlog
    backlog_model: Optional[ImplementationBacklog]
