from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from llm import LLMClient
from state import (
    ProjectModel, ArchitectureModel, DatabaseModel,
    ArchitectureValidationResult, ArchitectureValidationErrorWarning,
    DatabaseValidationResult, DatabaseValidationErrorWarning,
    RequestSchema, ResponseSchema, Parameter, Endpoint, OpenAPIModel,
    OpenAPIValidationResult, OpenAPIValidationErrorWarning,
    ImplementationBacklog,
)

# Structured Output Model for PRD Validation
class PRDValidationFindings(BaseModel):
    is_valid: bool = Field(
        description="True if the PRD has no missing information, contradictions, or ambiguities. False otherwise."
    )
    missing_information: List[str] = Field(
        default=[],
        description="List of critical details or elements that are missing from the PRD."
    )
    contradictions: List[str] = Field(
        default=[],
        description="List of conflicting statements or mutually exclusive requirements found in the PRD."
    )
    ambiguities: List[str] = Field(
        default=[],
        description="List of vague or unclear requirements that need definition."
    )
    justification: str = Field(
        description="Brief summary/justification of the validation findings."
    )

def validate_prd(prd: str, client: LLMClient, model: Optional[str] = None) -> PRDValidationFindings:
    system_instruction = (
        "You are a Senior Product Analyst and Requirements Engineer. Your task is to analyze the user's "
        "Product Requirements Document (PRD) or product idea to check for missing information, contradictions, "
        "and ambiguities.\n\n"
        "Identify:\n"
        "- Missing Information: Critical details required for system design (e.g. missing payment provider, authentication details, throughput estimates).\n"
        "- Contradictions: Mutually exclusive statements (e.g. demanding 100% offline usage but also real-time database syncing).\n"
        "- Ambiguities: Vague, subjective terms or poorly defined behaviors.\n\n"
        "If any of these are found, set is_valid = false."
    )
    
    prompt = f"Analyze the following PRD for validation findings:\n\n{prd}"
    
    # Generate structured validation output
    result = client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=PRDValidationFindings,
        model=model
    )
    return result

def generate_requirements(
    project_model: ProjectModel,
    client: LLMClient,
    model: Optional[str] = None
) -> str:
    system_instruction = (
        "You are an expert Systems Architect. Your goal is to transform the Canonical Project Model (CPM) "
        "into a formal software requirements document.\n\n"
        "The CPM is your source of truth. Your output must be a clean, detailed Markdown document structured with:\n"
        "1. Executive Summary & Product Goal\n"
        "2. Functional Requirements\n"
        "3. Non-Functional Requirements\n"
        "4. Technological Choices, Integrations & Constraints\n"
        "5. Assumptions & Scope Boundaries\n\n"
        "Format the document professionally using Markdown headings, tables, and lists."
    )
    
    import json
    if hasattr(project_model, "model_dump_json"):
        project_model_str = project_model.model_dump_json(indent=2)
    elif hasattr(project_model, "model_dump"):
        project_model_str = json.dumps(project_model.model_dump(), indent=2)
    else:
        project_model_str = json.dumps(project_model, indent=2)
        
    prompt = f"Canonical Project Model (CPM) JSON:\n{project_model_str}"
        
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        model=model
    )

def revise_requirements(
    project_model: ProjectModel,
    current_requirements: str,
    feedback: str,
    client: LLMClient,
    model: Optional[str] = None
) -> str:
    system_instruction = (
        "You are an expert Systems Architect. You need to revise the current software requirements document "
        "based on user feedback and the Canonical Project Model (CPM) which is the source of truth.\n"
        "Ensure all user feedback requests are fully addressed while keeping the document structured, "
        "realistic, and professional."
    )
    
    import json
    if hasattr(project_model, "model_dump_json"):
        project_model_str = project_model.model_dump_json(indent=2)
    elif hasattr(project_model, "model_dump"):
        project_model_str = json.dumps(project_model.model_dump(), indent=2)
    else:
        project_model_str = json.dumps(project_model, indent=2)
        
    prompt = (
        f"Canonical Project Model (CPM) JSON:\n{project_model_str}\n\n"
        f"Current Requirements:\n{current_requirements}\n\n"
        f"User Feedback/Requested Changes:\n{feedback}\n\n"
        f"Please update and output the revised software requirements document."
    )
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        model=model
    )

class ArchitecturePatternDecision(BaseModel):
    pattern: str = Field(description="The chosen architecture pattern. Must be one of: modular_monolith, microservices, serverless.")
    justification: str = Field(description="Detailed technical justification for selecting this pattern based on CPM constraints, actors, scaling needs, etc.")

def decide_architecture_pattern_agent(
    project_model: ProjectModel,
    client: LLMClient,
    model: Optional[str] = None
) -> ArchitecturePatternDecision:
    system_instruction = (
        "You are a Principal Systems Architect.\n"
        "Your task is to analyze the ProjectModel (CPM) requirements, scaling constraints, and functional features "
        "to decide the optimal high-level architecture pattern.\n\n"
        "Guidelines:\n"
        "1. Standard Patterns: Choose from: 'modular_monolith', 'microservices', or 'serverless'.\n"
        "2. Keep it simple: Prefer 'modular_monolith' unless there is clear justification in the CPM (e.g. extremely high peak QPS > 20,000, distinct operational boundaries, multi-tenant requirements, independent deployments) for microservices or serverless.\n"
        "3. Provide a clear justification mapping project requirements to the decision."
    )
    
    import json
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        return json.dumps(obj, indent=2)
        
    prompt = f"Analyze this ProjectModel and decide the architecture pattern:\n\n{to_json_str(project_model)}"
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ArchitecturePatternDecision,
        model=model
    )

def generate_architecture_agent(
    project_model: ProjectModel,
    architecture_pattern: str,
    client: LLMClient,
    model: Optional[str] = None
) -> ArchitectureModel:
    system_instruction = (
        "You are an expert Systems Architect.\n"
        "Your task is to design a high-level system architecture based on the Canonical Project Model (CPM).\n\n"
        f"IMPORTANT: The high-level architecture pattern has been pre-decided as: '{architecture_pattern}'. "
        "You must design the architecture services, datastores, queues, and security model strictly adhering to this pattern.\n\n"
        "Responsibilities:\n"
        "1. Ensure all services align with the pre-decided pattern.\n"
        "2. Identify the logical services and their responsibilities/technology stack.\n"
        "3. Identify the required datastores (relational, key-value, etc.), technologies, and justifications.\n"
        "4. Identify any external third-party integrations needed.\n"
        "5. Identify any messaging/queuing systems if async tasks or pub-sub communication is required.\n"
        "6. Define the security architecture (auth mechanisms, authorization scheme, and data protection policies).\n"
        "7. Define the scalability characteristics (scaling strategy, caching strategy, and potential bottlenecks).\n\n"
        "Ensure the generated ArchitectureModel is highly practical, cohesive, and directly mapped from the project model."
    )
    
    import json
    if hasattr(project_model, "model_dump_json"):
        project_model_str = project_model.model_dump_json(indent=2)
    elif hasattr(project_model, "model_dump"):
        project_model_str = json.dumps(project_model.model_dump(), indent=2)
    else:
        project_model_str = json.dumps(project_model, indent=2)
        
    prompt = f"Design the system architecture based on the following Canonical Project Model (CPM):\n\n{project_model_str}"
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ArchitectureModel,
        model=model
    )

def revise_architecture_agent(
    project_model: ProjectModel,
    current_architecture: ArchitectureModel,
    feedback: str,
    client: LLMClient,
    model: Optional[str] = None
) -> ArchitectureModel:
    system_instruction = (
        "You are an expert Systems Architect.\n"
        "Your task is to revise the current system architecture based on the user's feedback.\n\n"
        "The Canonical Project Model (CPM) remains your source of truth. Ensure all user feedback "
        "requests are fully addressed while keeping the ArchitectureModel realistic, cohesive, and professional.\n"
        "IMPORTANT: Be conservative and prefer 'modular_monolith' unless the CPM and user feedback clearly justify another architecture style."
    )
    
    import json
    if hasattr(project_model, "model_dump_json"):
        project_model_str = project_model.model_dump_json(indent=2)
    elif hasattr(project_model, "model_dump"):
        project_model_str = json.dumps(project_model.model_dump(), indent=2)
    else:
        project_model_str = json.dumps(project_model, indent=2)
        
    if hasattr(current_architecture, "model_dump_json"):
        current_arch_str = current_architecture.model_dump_json(indent=2)
    elif hasattr(current_architecture, "model_dump"):
        current_arch_str = json.dumps(current_architecture.model_dump(), indent=2)
    else:
        current_arch_str = json.dumps(current_architecture, indent=2)
        
    prompt = (
        f"Canonical Project Model (CPM) JSON:\n{project_model_str}\n\n"
        f"Current Architecture Model JSON:\n{current_arch_str}\n\n"
        f"User Feedback/Requested Changes:\n{feedback}\n\n"
        f"Please update and output the revised ArchitectureModel."
    )
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ArchitectureModel,
        model=model
    )

def generate_architecture_diagram_agent(
    architecture_model: ArchitectureModel,
    client: LLMClient,
    model: Optional[str] = None
) -> str:
    system_instruction = (
        "You are an expert Systems Architect and Technical Illustrator.\n"
        "Your task is to generate a beautiful, syntactically correct Mermaid.js graph diagram from an ArchitectureModel.\n\n"
        "Rules:\n"
        "1. Start the output with `graph TD` or `graph LR` (prefer TD for hierarchy).\n"
        "2. Represent services as rectangles: `service_id[\"Service Name\"]`.\n"
        "3. Represent datastores as cylinders: `datastore_id[(\"Datastore Name\")]`.\n"
        "4. Represent external integrations as diamonds: `integration_id{\"Integration Name\"}`.\n"
        "5. Represent message queues as flags: `queue_id>\"Queue Name\"]`.\n"
        "6. Connect the nodes with meaningful arrows `-->` showing the data flow, API calls, or database writes based on service responsibilities and queue configurations.\n"
        "7. DO NOT link every service to every datastore blindly. Only link a service to a datastore if it makes sense (e.g. UserService talks to UserDB).\n"
        "8. Apply beautiful, modern dark-mode colors using Mermaid style commands. Use distinct classes or inline styles for services, datastores, and queues (e.g. style commands at the bottom).\n"
        "9. Output ONLY the raw Mermaid diagram text. Do not wrap it in markdown code blocks like ```mermaid."
    )
    
    import json
    if hasattr(architecture_model, "model_dump_json"):
        arch_str = architecture_model.model_dump_json(indent=2)
    elif hasattr(architecture_model, "model_dump"):
        arch_str = json.dumps(architecture_model.model_dump(), indent=2)
    else:
        arch_str = json.dumps(architecture_model, indent=2)
        
    prompt = f"Generate a beautiful, highly connected Mermaid topology diagram for this Architecture:\n\n{arch_str}"
    
    diagram = client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        model=model
    )
    # Clean up markdown code blocks if the LLM returned them
    diagram_clean = diagram.strip()
    if diagram_clean.startswith("```"):
        lines = diagram_clean.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        diagram_clean = "\n".join(lines).strip()
    return diagram_clean

def generate_database_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    feedback: Optional[str],
    client: LLMClient,
    model: Optional[str] = None
) -> DatabaseModel:
    system_instruction = (
        "You are an expert Database Architect.\n"
        "Your task is to design a robust relational database schema (DatabaseModel) based on the Canonical Project Model (CPM) and high-level ArchitectureModel.\n\n"
        "Responsibilities:\n"
        "1. Derive relational entities from the CPM (entities, features, relationships).\n"
        "2. Align and assign ownership of tables to the service boundaries identified in the ArchitectureModel.\n"
        "3. Generate PostgreSQL-compatible tables, columns, constraints, and relationships.\n"
        "4. Create relationships explicitly (one_to_one, one_to_many, many_to_many).\n"
        "5. Recommend database indexes only when justified by scaling or query patterns.\n"
        "6. Avoid unnecessary tables or columns.\n"
        "7. If feedback/revision requirements are provided, revise the database design accordingly while keeping the design cohesive and compliant."
    )
    
    import json
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        else:
            return json.dumps(obj, indent=2)

    project_model_str = to_json_str(project_model)
    arch_model_str = to_json_str(architecture_model)
    
    prompt = (
        f"Canonical Project Model (CPM):\n{project_model_str}\n\n"
        f"Architecture Model:\n{arch_model_str}\n\n"
    )
    
    if feedback:
        prompt += f"User Feedback/Revision requested:\n{feedback}\n\n"
        prompt += "Please revise the current database design to address this feedback."
    else:
        prompt += "Please design the database schema from scratch based on the CPM and Architecture."

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=DatabaseModel,
        model=model
    )

def validate_architecture_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    client: LLMClient,
    model: Optional[str] = None
) -> ArchitectureValidationResult:
    # 1. Deterministic validation (Integration Check)
    errors = []
    warnings = []
    recommendations = []

    for integration_name in project_model.integrations:
        found = False
        for ext_int in architecture_model.external_integrations:
            if (integration_name.lower() in ext_int.name.lower()) or (ext_int.name.lower() in integration_name.lower()):
                found = True
                break
        if not found:
            errors.append(
                ArchitectureValidationErrorWarning(
                    type="integration_missing",
                    message=f"External integration '{integration_name}' from project requirements is missing in the architecture design.",
                    affected_item=integration_name
                )
            )

    # 2. LLM validation for non-deterministic rules
    system_instruction = (
        "You are an expert Systems Architect & QA Auditor.\n"
        "Your task is to validate the consistency and completeness of a system architecture (ArchitectureModel) "
        "against its project requirements (ProjectModel) according to these validation rules:\n\n"
        "1. Service Ownership: Every feature in the ProjectModel must belong to at least one service. If a feature has no owning service, flag an error.\n"
        "2. Entity Ownership: Every entity in the ProjectModel must be owned by exactly one service. If an entity has no owner, flag an error. If an entity appears owned by multiple services, flag a warning.\n"
        "3. Architecture Pattern Validation: Check if the architecture pattern is reasonable. (e.g., microservices for tiny project -> warning; serverless with long-running sync workflows -> warning).\n"
        "4. Security Validation: If authentication/authorization requirements exist in the CPM, ensure security model is defined (otherwise -> error). If auth is defined but authorization is missing -> warning.\n"
        "5. Queue Validation: If there are asynchronous workflows, background jobs, notifications, or event processing, and no queue exists -> warning.\n"
        "6. Scalability Validation: Compare scaling requirements against the pattern/datastores -> warning if undersized.\n"
        "7. Score Calculation: Assign a validation score between 0 and 100 based on overall compliance, completeness, and consistency of the architecture. Be critical: subtract points for missing integrations, orphan features, poorly justified architecture styles, or security gaps. If there are critical errors, the score must be under 70.\n\n"
        "Provide your findings as a structured JSON object containing errors, warnings, and recommendations."
    )

    import json
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        else:
            return json.dumps(obj, indent=2)

    prompt = (
        f"Project Model (CPM):\n{to_json_str(project_model)}\n\n"
        f"Architecture Model:\n{to_json_str(architecture_model)}\n\n"
        "Please perform validation of the non-deterministic rules (Service/Entity ownership, pattern reasonableness, security, queues, scalability) and return errors, warnings, recommendations, and a validation score."
    )

    llm_result = client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ArchitectureValidationResult,
        model=model
    )

    # Merge results
    for err in llm_result.errors:
        # Avoid duplicate integration errors if LLM also flags it
        if err.type == "integration_missing" or "integration" in err.type:
            continue
        errors.append(err)

    for warn in llm_result.warnings:
        warnings.append(warn)

    for rec in llm_result.recommendations:
        recommendations.append(rec)

    # Calculate score & is_valid from LLM validation agent
    score = llm_result.score
    is_valid = len(errors) == 0

    return ArchitectureValidationResult(
        is_valid=is_valid,
        score=score,
        errors=errors,
        warnings=warnings,
        recommendations=recommendations
    )

def validate_database_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    client: LLMClient,
    model: Optional[str] = None
) -> DatabaseValidationResult:
    import json

    errors: list[DatabaseValidationErrorWarning] = []
    warnings: list[DatabaseValidationErrorWarning] = []
    recommendations = []

    # ── helpers ────────────────────────────────────────────────────────────────
    table_names = {t.name.lower() for t in database_model.tables}

    def _err(type_: str, message: str, affected: str) -> DatabaseValidationErrorWarning:
        return DatabaseValidationErrorWarning(type=type_, message=message, affected_item=affected)

    def _warn(type_: str, message: str, affected: str) -> DatabaseValidationErrorWarning:
        return DatabaseValidationErrorWarning(type=type_, message=message, affected_item=affected)

    # ── Rule 1: Entity Coverage ─────────────────────────────────────────────────
    for entity in project_model.entities:
        entity_lower = entity.lower().replace(" ", "_")
        # Accept partial matches so "Order" covers "orders", "user_order", etc.
        covered = any(
            entity_lower in tname or tname in entity_lower
            for tname in table_names
        )
        if not covered:
            errors.append(_err(
                "entity_missing_table",
                f"Entity '{entity}' from the ProjectModel has no corresponding table in the DatabaseModel.",
                entity
            ))

    # ── Rule 2: Relationship Coverage ──────────────────────────────────────────
    db_rel_pairs = {
        (r.source_table.lower(), r.target_table.lower())
        for r in database_model.relationships
    }
    for rel_desc in project_model.relationships:
        # Heuristic: pull two nouns from the description and look for a matching pair
        words = [w.strip(",.").lower() for w in rel_desc.split()]
        found = any(
            (w in src or src in w) and (w2 in tgt or tgt in w2)
            for (src, tgt) in db_rel_pairs
            for w in words
            for w2 in words
            if w != w2
        )
        if not found:
            errors.append(_err(
                "relationship_missing",
                f"ProjectModel relationship '{rel_desc}' has no matching relationship in the DatabaseModel.",
                rel_desc
            ))

    # ── Rule 4: Primary Key Validation ─────────────────────────────────────────
    for table in database_model.tables:
        pk_cols = [c for c in table.columns if c.primary_key]
        if len(pk_cols) == 0:
            errors.append(_err(
                "missing_primary_key",
                f"Table '{table.name}' has no primary key defined.",
                table.name
            ))
        elif len(pk_cols) > 1:
            errors.append(_err(
                "multiple_primary_keys",
                f"Table '{table.name}' has {len(pk_cols)} primary key columns ({', '.join(c.name for c in pk_cols)}). "
                "Composite PKs should be modelled explicitly via a unique constraint.",
                table.name
            ))

    # ── Rules 3, 5, 6, 7, 8: LLM validation ────────────────────────────────────
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        return json.dumps(obj, indent=2)

    system_instruction = (
        "You are an expert Database Architect & QA Auditor.\n"
        "You will be given a ProjectModel, an ArchitectureModel, and a DatabaseModel.\n"
        "Your task is to validate the DatabaseModel for the following rules and return ONLY the findings "
        "(you do NOT need to re-check entity coverage or primary keys — those are already validated):\n\n"
        "3. Ownership Consistency: Tables should belong to the service that owns the entity in the ArchitectureModel.\n"
        "   - Error if a table is owned by no service.\n"
        "   - Warning if ownership conflicts with the ArchitectureModel.\n"
        "5. Foreign Key Coverage: Every relationship in the DatabaseModel should be backed by a foreign key column or a join table.\n"
        "   - Warning if a relationship lacks explicit FK representation.\n"
        "6. Index Validation: Auth tables, frequently queried lookup tables, and foreign-key columns should have indexes.\n"
        "   - Warning for missing expected indexes.\n"
        "   - Recommendation for useful index suggestions.\n"
        "7. Integration Storage: Verify that CPM integrations have supporting storage (e.g., OAuth → user_identity, Payments → transaction, Notifications → notification).\n"
        "   - Warning when integration storage table is absent.\n"
        "8. Data Type Validation: IDs should use UUID or BIGSERIAL; timestamps (created_at, updated_at) should use TIMESTAMPTZ; status/flag columns should use boolean or enum.\n"
        "   - Warning for suspicious data type choices.\n\n"
        "Return a valid JSON object with keys: errors, warnings, recommendations, score.\n"
        "For score, assign a database validation score between 0 and 100 based on schema quality, primary key annotation, index coverage, and compliance with the architecture model. If there are blocking errors, the score must be under 70.\n"
        "Each error/warning must have: type (string), message (string), affected_item (string).\n"
        "Each recommendation must have: message (string)."
    )

    prompt = (
        f"ProjectModel:\n{to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{to_json_str(architecture_model)}\n\n"
        f"DatabaseModel:\n{to_json_str(database_model)}\n\n"
        "Validate rules 3, 5, 6, 7, and 8 as instructed and return findings including the score."
    )

    llm_result = client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=DatabaseValidationResult,
        model=model
    )

    # Merge LLM findings
    errors.extend(llm_result.errors)
    warnings.extend(llm_result.warnings)
    recommendations.extend(llm_result.recommendations)

    # LLM score
    score = llm_result.score
    is_valid = len(errors) == 0

    return DatabaseValidationResult(
        is_valid=is_valid,
        score=score,
        errors=errors,
        warnings=warnings,
        recommendations=recommendations
    )

def generate_openapi_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    client: LLMClient,
    feedback: Optional[str] = None,
    model: Optional[str] = None
) -> OpenAPIModel:
    import json
    
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        return json.dumps(obj, indent=2)

    system_instruction = (
        "You are an expert API Architect.\n"
        "Your task is to generate or revise a structured OpenAPI specification (OpenAPIModel) "
        "based on the ProjectModel, ArchitectureModel, and DatabaseModel.\n\n"
        "Generation Rules:\n"
        "1. CRUD Generation: For major entities in the ProjectModel/DatabaseModel, generate clean RESTful endpoints (GET, POST, PUT, PATCH, DELETE). "
        "Only generate operations that make sense for that entity.\n"
        "2. Service Ownership: Every endpoint must belong to exactly one service from the ArchitectureModel.\n"
        "3. Request/Response Models: Generate realistic request and response schemas using DatabaseModel tables and ProjectModel entities. "
        "Avoid exposing internal fields like password hashes or auto-incremented primary keys where inappropriate.\n"
        "4. Authentication: Inspect the security settings in the ArchitectureModel. If authentication is required for an endpoint, set authentication_required = true.\n"
        "5. Integrations: Generate endpoints required for integrations when appropriate (e.g. Stripe webhooks, OAuth callbacks, notifications).\n"
        "6. Relationships: Generate nested routes only when justified (e.g., GET /users/{id}/orders). Avoid excessive nesting.\n"
        "7. Consistency: Every endpoint should map to a logical service, entity, and database table. Avoid orphan endpoints.\n"
        "8. Payload Generation: For every endpoint, generate a realistic, formatted, mock JSON example payload string for `request_body` (if it has a request schema) and `response_body` (if it has a response schema). These must be valid JSON strings, pretty-printed, containing realistic mock data (e.g. realistic user names, UUIDs, dates, amounts).\n\n"
        "Ensure all endpoints are versioned (e.g., starting with /api/v1/) if required, and follow RESTful best practices."
    )

    prompt = (
        f"ProjectModel:\n{to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{to_json_str(architecture_model)}\n\n"
        f"DatabaseModel:\n{to_json_str(database_model)}\n\n"
    )

    if feedback:
        prompt += f"Feedback for revision:\n{feedback}\n\nPlease revise the API design based on this feedback."
    else:
        prompt += "Please generate the initial API design."

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=OpenAPIModel,
        model=model
    )

def validate_openapi_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    openapi_model: OpenAPIModel,
    client: LLMClient,
    model: Optional[str] = None
) -> OpenAPIValidationResult:
    import json
    
    errors: List[OpenAPIValidationErrorWarning] = []
    warnings: List[OpenAPIValidationErrorWarning] = []
    recommendations = []

    # 1. Deterministic validation checks
    valid_services = {s.name.lower() for s in architecture_model.services}
    valid_methods = {"GET", "POST", "PUT", "PATCH", "DELETE"}

    for endpoint in openapi_model.endpoints:
        # Service ownership check
        if endpoint.service.lower() not in valid_services:
            errors.append(
                OpenAPIValidationErrorWarning(
                    type="service_missing",
                    message=f"Endpoint '{endpoint.path}' references service '{endpoint.service}' which does not exist in the ArchitectureModel.",
                    affected_item=endpoint.path
                )
            )
        
        # Valid HTTP method check
        if endpoint.method.upper() not in valid_methods:
            errors.append(
                OpenAPIValidationErrorWarning(
                    type="invalid_method",
                    message=f"Endpoint '{endpoint.path}' uses unsupported HTTP method '{endpoint.method}'. Supported: GET, POST, PUT, PATCH, DELETE.",
                    affected_item=endpoint.path
                )
            )

    # 2. LLM validation for remaining complex rules
    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        return json.dumps(obj, indent=2)

    system_instruction = (
        "You are an expert API Quality Auditor.\n"
        "Your task is to validate a structured OpenAPI specification (OpenAPIModel) against the ProjectModel, ArchitectureModel, and DatabaseModel.\n\n"
        "Validation Rules:\n"
        "1. Entity Coverage: Every major entity in the ProjectModel must have appropriate endpoint coverage (e.g. GET/POST). If an entity has no coverage, flag an error.\n"
        "2. Service Ownership Conflicts: If an endpoint ownership conflicts with its natural architectural boundaries, flag a warning.\n"
        "3. Table Mapping: Every endpoint should map to at least one table in the DatabaseModel. Flag an error if an endpoint references fields/records from a missing table.\n"
        "4. Request Schema Validation: Check request schemas exist where required (e.g., POST/PUT/PATCH), required fields are present, and fields correctly map to database columns. Flag an error if invalid.\n"
        "5. Response Schema Validation: Check response schema exists and references valid database/project entities. Flag an error if invalid.\n"
        "6. Authentication Validation: Compare endpoint authentication flag with ArchitectureModel security settings. Warning if a sensitive endpoint is missing authentication. Error if authentication requirements are violated.\n"
        "7. Relationship Endpoints: Check whether relationship-based routes exist when justified (e.g. GET /users/{id}/orders). Generate recommendations only; do not generate errors/warnings for missing nested routes.\n"
        "8. Integration Endpoints: Verify required integration endpoints exist (e.g. OAuth callback, webhook handler). Warning if missing.\n"
        "9. CRUD Consistency: For editable entities, verify if CRUD operations are appropriately covered. Generate warnings when major operations are missing.\n\n"
        "Return a valid JSON object with keys: errors, warnings, recommendations, score.\n"
        "For score, assign an API validation score between 0 and 100 based on API spec completeness, CRUD consistency, authentication checks, and model alignment. If there are blocking errors, the score must be under 70.\n"
        "Each error/warning must have: type (string), message (string), affected_item (string).\n"
        "Each recommendation must have: message (string)."
    )

    prompt = (
        f"ProjectModel:\n{to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{to_json_str(architecture_model)}\n\n"
        f"DatabaseModel:\n{to_json_str(database_model)}\n\n"
        f"OpenAPIModel:\n{to_json_str(openapi_model)}\n\n"
        "Please perform validation of the non-deterministic rules (Entity coverage, table mapping, request/response schema, auth, relationship routes, integrations, CRUD consistency) and return findings including the score."
    )

    llm_result = client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=OpenAPIValidationResult,
        model=model
    )

    # Merge results
    for err in llm_result.errors:
        # Avoid duplicating service_missing and invalid_method errors if LLM also flags them
        if err.type in {"service_missing", "invalid_method"}:
            continue
        errors.append(err)

    for warn in llm_result.warnings:
        warnings.append(warn)

    for rec in llm_result.recommendations:
        recommendations.append(rec)

    # LLM score
    score = llm_result.score
    is_valid = len(errors) == 0

    return OpenAPIValidationResult(
        is_valid=is_valid,
        score=score,
        errors=errors,
        warnings=warnings,
        recommendations=recommendations
    )

def json_dumps_helper(d: Dict[str, str]) -> str:
    import json
    return json.dumps(d, indent=2)

# Requirements Extraction Models
class ExtractedRequirements(BaseModel):
    actors: List[str] = Field(
        default=[],
        description="Actors or user roles explicitly identified in the PRD."
    )
    workflows: List[str] = Field(
        default=[],
        description="User workflows, journeys, or step-by-step processes explicitly described in the PRD."
    )
    features: List[str] = Field(
        default=[],
        description="Functional features or capabilities explicitly mentioned in the PRD."
    )
    integrations: List[str] = Field(
        default=[],
        description="Third-party integrations or external services explicitly requested in the PRD."
    )
    constraints: List[str] = Field(
        default=[],
        description="Non-functional constraints, rules, or limits explicitly defined in the PRD."
    )

class ExtractionResult(BaseModel):
    extracted_requirements: ExtractedRequirements = Field(
        description="The facts extracted from the PRD."
    )

def extract_requirements_from_prd(prd: str, client: LLMClient, model: Optional[str] = None) -> ExtractionResult:
    system_instruction = (
        "You are a strict Requirements Analyst. Your task is to extract requirements from the user's PRD.\n\n"
        "Rules:\n"
        "1. Extract FACTS only. Do not assume or hallucinate any details that are not in the text.\n"
        "2. Make NO architectural decisions (e.g., do not suggest microservices, gateway layers, etc. unless explicitly mandated in the PRD).\n"
        "3. Make NO database decisions (e.g., do not assume PostgreSQL or Redis unless explicitly requested in the PRD).\n"
        "4. Categorize facts into: actors, workflows, features, integrations, and constraints.\n"
        "If a category has no facts in the PRD, leave it as an empty list."
    )
    
    prompt = f"Extract requirements from the following PRD:\n\n{prd}"
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ExtractionResult,
        model=model
    )

# Clarification Planning Models
class ClarificationCategories(BaseModel):
    critical: List[str] = Field(
        default=[],
        description="Questions about missing information that blocks requirements generation (e.g. unknown payment gateway providers like Stripe/Razorpay, core auth mechanisms, or required integrations)."
    )
    recommended: List[str] = Field(
        default=[],
        description="Questions about missing information that improves requirements quality (e.g. SLA/uptime requirements, throughput targets, latency targets)."
    )
    optional: List[str] = Field(
        default=[],
        description="Questions about missing information with safe defaults (e.g. monitoring stacks, database backup strategy)."
    )

class ClarificationPlanResult(BaseModel):
    clarifications: ClarificationCategories = Field(
        description="The planned clarifications grouped by importance/severity."
    )

def plan_clarifications(
    input_json: str,
    client: LLMClient,
    model: Optional[str] = None
) -> ClarificationPlanResult:
    system_instruction = (
        "You are a Senior Systems Architect and Clarification Planner.\n"
        "Your task is to analyze the input (which could be extracted requirements or structured validation findings) "
        "and determine what crucial details are missing.\n"
        "Formulate direct, specific clarification questions (maximum 3 in total) and categorize them into:\n"
        "1. CRITICAL: Missing information that blocks requirements generation.\n"
        "2. RECOMMENDED: Missing information that improves requirements quality.\n"
        "3. OPTIONAL: Missing information with safe defaults."
    )
    
    prompt = f"Analyze the following input and plan clarifications:\n\n{input_json}"
    
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ClarificationPlanResult,
        model=model
    )

def build_cpm_agent(
    prd: str,
    extracted_requirements_json: str,
    clarifications_json: str,
    client: LLMClient,
    model: Optional[str] = None,
    feedback: Optional[str] = None
) -> ProjectModel:
    system_instruction = (
        "You are a Senior Systems Architect and Data Modeler.\n"
        "Your task is to build or revise a structured Canonical Project Model (CPM) based on the PRD, "
        "extracted requirements facts, the user's answers to clarification questions, and any feedback.\n\n"
        "Synthesize all this information into a cohesive, structured ProjectModel. Populate the following fields:\n"
        "- actors: Actor roles and users interacting with the system.\n"
        "- features: High-level functional modules or capabilities.\n"
        "- user_stories: Explicit user stories described or implied by the workflows.\n"
        "- entities: Key business database/domain entities.\n"
        "- relationships: Key connections between entities.\n"
        "- integrations: Third-party systems/APIs (e.g. Stripe, PayPal).\n"
        "- functional_requirements: Fine-grained functional rules and requirements.\n"
        "- non_functional_requirements: Non-functional requirements (e.g. latencies, throughput, SLA targets).\n"
        "- assumptions: Any operational, business, or technical assumptions.\n"
        "- constraints: Technical constraints, limits, or compliance requirements (e.g. PCI-DSS, GDPR).\n\n"
        "Do not invent facts or make arbitrary architectural decisions unless they are supported by the input or standard system engineering practices."
    )
    
    prompt = (
        f"PRD:\n{prd}\n\n"
        f"Extracted Requirements:\n{extracted_requirements_json}\n\n"
        f"Clarifications:\n{clarifications_json}"
    )
    if feedback:
        prompt += f"\n\nUser Revision Feedback:\n{feedback}"
        
    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ProjectModel,
        model=model
    )

def generate_backlog_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    openapi_model: OpenAPIModel,
    client: LLMClient,
    feedback: Optional[str] = None,
    model: Optional[str] = None
) -> ImplementationBacklog:
    """Generate a complete implementation backlog from all design artifacts."""
    import json

    def to_json_str(obj):
        if hasattr(obj, "model_dump_json"):
            return obj.model_dump_json(indent=2)
        elif hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(), indent=2)
        return json.dumps(obj, indent=2)

    system_instruction = (
        "You are a Senior Engineering Manager and Technical Program Manager.\n"
        "Your task is to generate a complete, realistic implementation backlog from the provided "
        "system design artifacts (ProjectModel, ArchitectureModel, DatabaseModel, OpenAPIModel).\n\n"
        "BACKLOG STRUCTURE:\n"
        "The backlog is organized as: Epics → Stories → Tasks.\n\n"
        "EPIC GENERATION RULES:\n"
        "1. Create epics from major feature areas identified in the ProjectModel (e.g., Authentication, "
        "User Management, Ordering, Payments, Notifications, Search, Admin).\n"
        "2. Always include a 'Project Setup & Infrastructure' epic for foundational work.\n"
        "3. Always include a 'Testing & Quality Assurance' epic.\n"
        "4. Each epic must have a clear name and description.\n\n"
        "STORY GENERATION RULES:\n"
        "1. Generate stories from user workflows and scenarios in the ProjectModel.\n"
        "2. Each story should represent a user-facing or developer-facing capability.\n"
        "3. Stories should be small enough to complete in 1-2 sprints.\n\n"
        "TASK GENERATION RULES:\n"
        "1. Generate tasks from concrete implementation work:\n"
        "   - Database tables → CREATE TABLE migrations, model definitions\n"
        "   - API endpoints → Controller/handler implementations\n"
        "   - Services → Business logic implementations\n"
        "   - Integrations → Third-party API integrations\n"
        "2. Include testing tasks (unit tests, integration tests, e2e tests).\n"
        "3. Include database migration tasks for schema changes.\n"
        "4. Include deployment/infrastructure tasks (CI/CD, Docker, monitoring).\n"
        "5. Each task must have:\n"
        "   - title: concise, actionable (e.g., 'Implement POST /api/v1/users endpoint')\n"
        "   - description: detailed implementation guidance\n"
        "   - category: one of 'backend', 'frontend', 'database', 'infrastructure', 'testing'\n"
        "   - estimated_complexity: one of 'XS', 'S', 'M', 'L', 'XL'\n"
        "     XS = < 1 hour, S = 1-4 hours, M = 4-8 hours, L = 1-3 days, XL = 3-5 days\n"
        "   - dependencies: list of task titles this task depends on (empty if none)\n\n"
        "DEPENDENCY RULES:\n"
        "1. Database migration tasks should come before backend tasks that use those tables.\n"
        "2. Backend API tasks should come before frontend tasks that consume them.\n"
        "3. Infrastructure tasks (CI/CD, Docker) should be in the first epic.\n"
        "4. Testing tasks should depend on the implementation tasks they test.\n\n"
        "QUALITY RULES:\n"
        "1. Every database table must have a corresponding migration task.\n"
        "2. Every API endpoint must have a corresponding implementation task.\n"
        "3. Every service must have at least one integration test task.\n"
        "4. The backlog should be complete enough to ship a production v1.\n"
        "5. Do NOT include placeholder or vague tasks — be specific."
    )

    prompt = (
        f"ProjectModel:\n{to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{to_json_str(architecture_model)}\n\n"
        f"DatabaseModel:\n{to_json_str(database_model)}\n\n"
        f"OpenAPIModel:\n{to_json_str(openapi_model)}\n\n"
    )

    if feedback:
        prompt += (
            f"User Feedback for revision:\n{feedback}\n\n"
            "Please revise the backlog based on this feedback while keeping the structure intact."
        )
    else:
        prompt += "Generate the complete implementation backlog."

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ImplementationBacklog,
        model=model
    )


# ─── GitHub Issue Agents ──────────────────────────────────────────────────────

class IssueDraftQuestions(BaseModel):
    questions: List[str] = Field(
        description="A list of 3-5 targeted clarifying questions the agent needs answered to write a high-quality GitHub issue."
    )


def generate_issue_questions_agent(
    task_title: str,
    epic_name: str,
    story_name: str,
    project_name: str,
    workspace: str,
    description: str,
    messages: List[dict],
    client: LLMClient,
    model: Optional[str] = None,
) -> IssueDraftQuestions:
    """Step 1: Analyse task context and generate targeted clarifying questions."""
    import json

    thread_text = ""
    if messages:
        thread_text = "\n".join(
            f"[{m.get('role','user').upper()}] {m.get('sender','')}: {m.get('content','')}"
            for m in messages
        )

    system_instruction = (
        "You are a senior engineering manager creating a GitHub issue for a task.\n"
        "Your goal is to ask 3-5 precise, targeted clarifying questions that will help you "
        "write a rich, actionable GitHub issue. Focus on:\n"
        "- Acceptance criteria that are unclear\n"
        "- Technical approach or constraints\n"
        "- Edge cases or known blockers\n"
        "- Dependencies on other tasks or services\n"
        "- Definition of done\n\n"
        "Do NOT ask about things that are already clear from the context."
    )

    prompt = (
        f"Task: {task_title}\n"
        f"Epic: {epic_name} | Story: {story_name}\n"
        f"Project: {project_name} ({workspace})\n"
    )
    if description:
        prompt += f"Description: {description}\n"
    if thread_text:
        prompt += f"\nDiscussion thread so far:\n{thread_text}\n"
    prompt += "\nGenerate targeted clarifying questions to help write the best possible GitHub issue."

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=IssueDraftQuestions,
        model=model,
    )


class FinalizedIssue(BaseModel):
    title: str = Field(description="A concise, action-oriented GitHub issue title (max 80 chars).")
    body: str = Field(description="Full GitHub issue body in markdown with ## sections.")


def finalize_issue_agent(
    task_title: str,
    epic_name: str,
    story_name: str,
    project_name: str,
    workspace: str,
    description: str,
    messages: List[dict],
    answers: List[dict],
    client: LLMClient,
    model: Optional[str] = None,
) -> FinalizedIssue:
    """Step 2: Generate the final GitHub issue title + body using context and answers."""
    thread_text = ""
    if messages:
        thread_text = "\n".join(
            f"[{m.get('role','user').upper()}] {m.get('sender','')}: {m.get('content','')}"
            for m in messages
        )

    answers_text = ""
    if answers:
        answers_text = "\n".join(
            f"Q: {a.get('question','')}\nA: {a.get('answer','')}"
            for a in answers
        )

    system_instruction = (
        "You are a senior engineering manager writing a GitHub issue.\n"
        "Using the task context, discussion thread, and answered clarifications, "
        "write a high-quality, actionable GitHub issue.\n\n"
        "The issue body MUST use GitHub Markdown and include these sections:\n"
        "## 📋 Summary\n"
        "## 🎯 Acceptance Criteria\n"
        "## 🔧 Technical Notes\n"
        "## 🚧 Dependencies\n"
        "## 📎 Context\n\n"
        "Be specific, clear, and professional. "
        "The title must be concise and action-oriented (e.g. 'Implement POST /api/v1/users endpoint')."
    )

    prompt = (
        f"Task: {task_title}\n"
        f"Epic: {epic_name} | Story: {story_name}\n"
        f"Project: {project_name} ({workspace})\n"
    )
    if description:
        prompt += f"Description: {description}\n"
    if thread_text:
        prompt += f"\nDiscussion thread:\n{thread_text}\n"
    if answers_text:
        prompt += f"\nClarifications provided:\n{answers_text}\n"
    prompt += "\nGenerate the final GitHub issue title and body."

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=FinalizedIssue,
        model=model,
    )
