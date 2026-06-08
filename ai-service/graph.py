import sqlite3
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.types import interrupt

from state import WorkflowState, WorkflowStatus, ArchitectureModel, DatabaseModel, OpenAPIModel
from llm import LLMClient
from agents import (
    validate_prd, 
    generate_requirements, 
    revise_requirements, 
    extract_requirements_from_prd,
    plan_clarifications,
    build_cpm_agent,
    decide_architecture_pattern_agent,
    generate_architecture_agent,
    revise_architecture_agent,
    generate_architecture_diagram_agent,
    validate_architecture_agent,
    generate_database_agent,
    validate_database_agent,
    generate_openapi_agent,
    validate_openapi_agent
)
from repair import run_repair_loop

# 1. Node implementations

def validate_prd_node(state: WorkflowState):
    # If we already have clarification answers, skip validation
    if state.get("clarification_responses"):
        return {
            "validation_status": "valid",
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }
        
    client = LLMClient(provider=state.get("provider"))
    prd = state["prd"]
    model = state.get("model")
    
    validation = validate_prd(prd, client, model=model)
    
    if not validation.is_valid:
        # Delegate clarification question planning to clarification_planner helper
        plan = plan_clarifications(validation.model_dump_json(), client, model=model)
        questions = plan.clarifications.critical + plan.clarifications.recommended + plan.clarifications.optional
        
        # Fallback if no questions were planned
        if not questions:
            questions = ["Can you provide more details on the product design requirements?"]
            
        # Trigger Clarification HITL
        user_response = interrupt({
            "type": "clarification",
            "questions": questions,
            "justification": validation.justification,
            "prompt": "The PRD has missing details. Please provide answers to the questions above or type 'intervention':"
        })
        
        # Check if user requested an intervention instead
        if isinstance(user_response, dict) and user_response.get("__intervention__"):
            return {
                "validation_status": "incomplete",
                "validation_findings": validation.model_dump(),
                "validation_questions": questions,
                "intervention_requested": True,
                "status": WorkflowStatus.CLARIFYING
            }
            
        # User response should map questions to responses
        return {
            "validation_status": "valid",
            "validation_findings": validation.model_dump(),
            "validation_questions": questions,
            "clarification_responses": user_response,
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }
    else:
        return {
            "validation_status": "valid",
            "validation_findings": validation.model_dump(),
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }

def generate_requirements_node(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    project_model = state.get("project_model")
    model = state.get("model")
    feedback = state.get("approval_feedback")
    
    if feedback:
        doc = revise_requirements(
            project_model=project_model,
            current_requirements=state.get("requirements_doc", ""),
            feedback=feedback,
            client=client,
            model=model
        )
    else:
        doc = generate_requirements(
            project_model=project_model,
            client=client,
            model=model
        )
        
    return {
        "requirements_doc": doc,
        "status": WorkflowStatus.AWAITING_REQUIREMENTS_APPROVAL,
        "approval_feedback": None  # Clear feedback once processed
    }

def approve_requirements_node(state: WorkflowState):
    requirements_doc = state.get("requirements_doc")
    
    # Trigger Approval HITL
    user_response = interrupt({
        "type": "approval",
        "requirements": requirements_doc,
        "prompt": "Review the requirements document. Enter 'approve' to proceed, 'intervention' to intervene, or enter changes/feedback:"
    })
    
    # Check if user requested intervention
    if isinstance(user_response, dict) and user_response.get("__intervention__"):
        return {
            "intervention_requested": True,
            "status": WorkflowStatus.AWAITING_REQUIREMENTS_APPROVAL
        }

    # User response can be action/feedback dict (from the UI) or a plain string
    feedback_text = ""
    is_approved = False

    if isinstance(user_response, dict):
        action = user_response.get("action", "").strip().lower()
        if action == "approve":
            is_approved = True
        else:
            feedback_text = user_response.get("feedback", "")
    elif isinstance(user_response, str):
        response_str = user_response.strip().lower()
        if response_str in ("approve", "approved", "yes", "y"):
            is_approved = True
        else:
            feedback_text = user_response

    if is_approved:
        return {
            "approved": True,
            "status": WorkflowStatus.COMPLETED
        }
    else:
        return {
            "approved": False,
            "approval_feedback": feedback_text,
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }

def intervention_node(state: WorkflowState):
    # Trigger Intervention HITL
    modification = interrupt({
        "type": "intervention",
        "prompt": "Intervention mode active. You can modify state values. Enter a dict of changes (e.g. {'prd': 'new details'}) or 'resume' to continue:",
        "state": {
            "prd": state.get("prd"),
            "provider": state.get("provider"),
            "validation_questions": state.get("validation_questions"),
            "clarification_responses": state.get("clarification_responses"),
            "requirements_doc": state.get("requirements_doc"),
            "status": state.get("status"),
            "project_model": state.get("project_model").model_dump() if hasattr(state.get("project_model"), "model_dump") else state.get("project_model"),
            "architecture_model": state.get("architecture_model").model_dump() if hasattr(state.get("architecture_model"), "model_dump") else state.get("architecture_model"),
            "architecture_feedback": state.get("architecture_feedback"),
            "database_model": state.get("database_model").model_dump() if hasattr(state.get("database_model"), "model_dump") else state.get("database_model"),
            "database_feedback": state.get("database_feedback")
        }
    })
    
    if isinstance(modification, dict) and "changes" in modification:
        changes = modification["changes"]
        
        # Parse Pydantic models from dict if modified
        if "project_model" in changes and isinstance(changes["project_model"], dict):
            from state import ProjectModel
            changes["project_model"] = ProjectModel(**changes["project_model"])
        if "architecture_model" in changes and isinstance(changes["architecture_model"], dict):
            from state import ArchitectureModel
            changes["architecture_model"] = ArchitectureModel(**changes["architecture_model"])
        if "database_model" in changes and isinstance(changes["database_model"], dict):
            from state import DatabaseModel
            changes["database_model"] = DatabaseModel(**changes["database_model"])
            
        log_msg = f"Intervened: Modified state fields {list(changes.keys())}"
        
        current_log = state.get("intervention_log") or []
        new_log = current_log + [log_msg]
        
        return {
            **changes,
            "intervention_requested": False,
            "intervention_log": new_log,
            "status": state.get("status")  # Retain status
        }
        
    return {
        "intervention_requested": False,
        "status": state.get("status")
    }

def requirements_extraction(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    prd = state["prd"]
    model = state.get("model")
    
    result = extract_requirements_from_prd(prd, client, model=model)
    return {
        "extracted_requirements": result.extracted_requirements,
        "status": WorkflowStatus.BUILDING_CPM
    }

def clarification_planner(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    extracted = state.get("extracted_requirements")
    model = state.get("model")
    
    import json
    if hasattr(extracted, "model_dump_json"):
        extracted_str = extracted.model_dump_json(indent=2)
    elif hasattr(extracted, "model_dump"):
        extracted_str = json.dumps(extracted.model_dump(), indent=2)
    else:
        extracted_str = json.dumps(extracted, indent=2)
        
    result = plan_clarifications(extracted_str, client, model=model)
    return {
        "clarifications": result.clarifications.model_dump()
    }

def build_cpm(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    prd = state["prd"]
    extracted = state.get("extracted_requirements")
    clarifications = state.get("clarification_responses")
    model = state.get("model")
    feedback = state.get("cpm_feedback")
    
    import json
    if hasattr(extracted, "model_dump_json"):
        extracted_str = extracted.model_dump_json(indent=2)
    elif hasattr(extracted, "model_dump"):
        extracted_str = json.dumps(extracted.model_dump(), indent=2)
    else:
        extracted_str = json.dumps(extracted, indent=2)
        
    clarifications_str = json.dumps(clarifications or {}, indent=2)
    
    project_model = build_cpm_agent(
        prd=prd,
        extracted_requirements_json=extracted_str,
        clarifications_json=clarifications_str,
        client=client,
        model=model,
        feedback=feedback
    )
    
    return {
        "project_model": project_model,
        "status": WorkflowStatus.AWAITING_CPM_APPROVAL
    }

def approve_cpm(state: WorkflowState):
    project_model = state.get("project_model")
    
    # Trigger CPM Approval HITL
    user_response = interrupt({
        "type": "cpm_approval",
        "project_model": project_model.model_dump() if hasattr(project_model, "model_dump") else project_model,
        "prompt": "Please review the Project Model (CPM). Options:\n1. 'approve'\n2. Provide feedback to revise it\n3. Type 'intervention':"
    })
    
    # Check if user requested an intervention instead
    if isinstance(user_response, dict) and user_response.get("__intervention__"):
        return {
            "cpm_approved": False,
            "intervention_requested": True,
            "status": WorkflowStatus.CLARIFYING
        }
        
    # User response can be action/feedback dict or plain string
    feedback_text = ""
    is_approved = False
    
    if isinstance(user_response, dict):
        action = user_response.get("action", "").strip().lower()
        if action == "approve":
            is_approved = True
        else:
            feedback_text = user_response.get("feedback", "")
    elif isinstance(user_response, str):
        if user_response.strip().lower() == "approve":
            is_approved = True
        else:
            feedback_text = user_response
            
    if is_approved:
        return {
            "cpm_approved": True,
            "cpm_feedback": None,
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }
    else:
        return {
            "cpm_approved": False,
            "cpm_feedback": feedback_text,
            "status": WorkflowStatus.BUILDING_CPM
        }

def build_architecture(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    project_model = state.get("project_model")
    feedback = state.get("architecture_feedback")
    model = state.get("model")
    
    if feedback:
        architecture_model = revise_architecture_agent(
            project_model=project_model,
            current_architecture=state.get("architecture_model"),
            feedback=feedback,
            client=client,
            model=model
        )
    else:
        pattern_decision = decide_architecture_pattern_agent(
            project_model=project_model,
            client=client,
            model=model
        )
        print(f"Decided architecture pattern: {pattern_decision.pattern}. Justification: {pattern_decision.justification}")
        
        architecture_model = generate_architecture_agent(
            project_model=project_model,
            architecture_pattern=pattern_decision.pattern,
            client=client,
            model=model
        )
        
    # Generate the beautiful connected Mermaid diagram using the dedicated agent
    try:
        diagram = generate_architecture_diagram_agent(
            architecture_model=architecture_model,
            client=client,
            model=model
        )
        architecture_model.system_diagram = diagram
    except Exception as diagram_err:
        print(f"Error calling architecture diagram agent: {diagram_err}. Using deterministic fallback.")
        try:
            from exporters.architecture import export_architecture_mermaid
            architecture_model.system_diagram = export_architecture_mermaid(architecture_model)
        except Exception as fallback_err:
            print(f"Error generating fallback diagram: {fallback_err}")
            
    # Run validation-repair loop
    try:
        architecture_model = run_repair_loop(
            artifact_type="architecture",
            artifact=architecture_model,
            project_model=project_model,
            client=client,
            model=model,
            validate_fn=validate_architecture_agent,
            validate_kwargs={"architecture_model": architecture_model},
        )
    except Exception as repair_err:
        print(f"Error in architecture repair loop: {repair_err}")
        
    return {
        "architecture_model": architecture_model,
        "architecture_feedback": None,
        "status": WorkflowStatus.AWAITING_ARCHITECTURE_APPROVAL
    }

def approve_architecture(state: WorkflowState):
    architecture_model = state.get("architecture_model")
    
    # Trigger Architecture Approval HITL
    user_response = interrupt({
        "type": "architecture_approval",
        "architecture_model": architecture_model.model_dump() if hasattr(architecture_model, "model_dump") else architecture_model,
        "prompt": "Please review the Architecture Model. Options:\n1. 'approve'\n2. Provide feedback to revise it\n3. Type 'intervention':"
    })
    
    # Check if user requested an intervention instead
    if isinstance(user_response, dict) and user_response.get("__intervention__"):
        return {
            "architecture_approved": False,
            "intervention_requested": True,
            "status": WorkflowStatus.CLARIFYING
        }
        
    # User response can be action/feedback dict or plain string
    feedback_text = ""
    is_approved = False
    
    if isinstance(user_response, dict):
        action = user_response.get("action", "").strip().lower()
        if action == "approve":
            is_approved = True
        else:
            feedback_text = user_response.get("feedback", "")
    elif isinstance(user_response, str):
        if user_response.strip().lower() == "approve":
            is_approved = True
        else:
            feedback_text = user_response
            
    if is_approved:
        return {
            "architecture_approved": True,
            "architecture_feedback": None,
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }
    else:
        return {
            "architecture_approved": False,
            "architecture_feedback": feedback_text,
            "status": WorkflowStatus.BUILDING_ARCHITECTURE
        }

def build_database(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    project_model = state.get("project_model")
    architecture_model = state.get("architecture_model")
    feedback = state.get("database_feedback")
    model = state.get("model")
    
    database_model = generate_database_agent(
        project_model=project_model,
        architecture_model=architecture_model,
        feedback=feedback,
        client=client,
        model=model
    )
    
    # Run validation-repair loop
    try:
        database_model = run_repair_loop(
            artifact_type="database",
            artifact=database_model,
            project_model=project_model,
            client=client,
            model=model,
            architecture_model=architecture_model,
            validate_fn=validate_database_agent,
            validate_kwargs={
                "architecture_model": architecture_model,
                "database_model": database_model,
            },
        )
    except Exception as repair_err:
        print(f"Error in database repair loop: {repair_err}")
    
    return {
        "database_model": database_model,
        "database_feedback": None,
        "status": WorkflowStatus.AWAITING_DATABASE_APPROVAL
    }

def approve_database(state: WorkflowState):
    database_model = state.get("database_model")
    
    # Trigger Database Approval HITL
    user_response = interrupt({
        "type": "database_approval",
        "database_model": database_model.model_dump() if hasattr(database_model, "model_dump") else database_model,
        "prompt": "Please review the Database Model. Options:\n1. 'approve'\n2. Provide feedback to revise it\n3. Type 'intervention':"
    })
    
    # Check if user requested an intervention instead
    if isinstance(user_response, dict) and user_response.get("__intervention__"):
        return {
            "database_approved": False,
            "intervention_requested": True,
            "status": WorkflowStatus.CLARIFYING
        }
        
    # User response can be action/feedback dict or plain string
    feedback_text = ""
    is_approved = False
    
    if isinstance(user_response, dict):
        action = user_response.get("action", "").strip().lower()
        if action == "approve":
            is_approved = True
        else:
            feedback_text = user_response.get("feedback", "")
    elif isinstance(user_response, str):
        if user_response.strip().lower() == "approve":
            is_approved = True
        else:
            feedback_text = user_response
            
    if is_approved:
        return {
            "database_approved": True,
            "database_feedback": None,
            "status": WorkflowStatus.BUILDING_API
        }
    else:
        return {
            "database_approved": False,
            "database_feedback": feedback_text,
            "status": WorkflowStatus.BUILDING_DATABASE
        }

def build_api(state: WorkflowState):
    client = LLMClient(provider=state.get("provider"))
    project_model = state.get("project_model")
    architecture_model = state.get("architecture_model")
    database_model = state.get("database_model")
    model = state.get("model")
    feedback = state.get("api_feedback")
    
    openapi_model = generate_openapi_agent(
        project_model=project_model,
        architecture_model=architecture_model,
        database_model=database_model,
        client=client,
        feedback=feedback,
        model=model
    )
    
    # Run validation-repair loop
    try:
        openapi_model = run_repair_loop(
            artifact_type="openapi",
            artifact=openapi_model,
            project_model=project_model,
            client=client,
            model=model,
            architecture_model=architecture_model,
            database_model=database_model,
            validate_fn=validate_openapi_agent,
            validate_kwargs={
                "architecture_model": architecture_model,
                "database_model": database_model,
                "openapi_model": openapi_model,
            },
        )
    except Exception as repair_err:
        print(f"Error in openapi repair loop: {repair_err}")
    
    return {
        "openapi_model": openapi_model,
        "status": WorkflowStatus.AWAITING_API_APPROVAL
    }

def approve_api(state: WorkflowState):
    openapi_model = state.get("openapi_model")
    
    # Trigger API Approval HITL
    user_response = interrupt({
        "type": "api_approval",
        "openapi_model": openapi_model.model_dump() if hasattr(openapi_model, "model_dump") else openapi_model,
        "prompt": "Please review the OpenAPI API specification. Options:\n1. 'approve'\n2. Provide feedback to revise it\n3. Type 'intervention':"
    })
    
    # Check if user requested an intervention instead
    if isinstance(user_response, dict) and user_response.get("__intervention__"):
        return {
            "api_approved": False,
            "intervention_requested": True,
            "status": WorkflowStatus.CLARIFYING
        }
        
    # User response can be action/feedback dict or plain string
    feedback_text = ""
    is_approved = False
    
    if isinstance(user_response, dict):
        action = user_response.get("action", "").strip().lower()
        if action == "approve":
            is_approved = True
        else:
            feedback_text = user_response.get("feedback", "")
    elif isinstance(user_response, str):
        if user_response.strip().lower() == "approve":
            is_approved = True
        else:
            feedback_text = user_response
            
    if is_approved:
        return {
            "api_approved": True,
            "api_feedback": None,
            "status": WorkflowStatus.GENERATING_REQUIREMENTS
        }
    else:
        return {
            "api_approved": False,
            "api_feedback": feedback_text,
            "status": WorkflowStatus.BUILDING_API
        }

# 2. Routing logic

def route_from_start(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    return "validate_prd"

def route_after_validation(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("validation_status") == "incomplete":
        # Loop back to validate_prd (it will hit interrupt again for clarification)
        return "validate_prd"
    return "requirements_extraction"

def route_after_cpm_approval(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("cpm_approved") is True:
        return "build_architecture"
    return "build_cpm"

def route_after_architecture_approval(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("architecture_approved") is True:
        return "build_database"
    return "build_architecture"

def route_after_database_approval(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("database_approved") is True:
        return "build_api"
    return "build_database"

def route_after_api_approval(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("api_approved") is True:
        return "generate_requirements"
    return "build_api"

def route_after_generation(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    return "approve_requirements"

def route_after_approval(state: WorkflowState):
    if state.get("intervention_requested"):
        return "intervention"
    if state.get("approved") is True:
        return END
    return "generate_requirements"  # Loop back to regenerate/revise

def route_after_intervention(state: WorkflowState):
    status = state.get("status")
    if status == WorkflowStatus.GENERATING_REQUIREMENTS:
        return "generate_requirements"
    elif status == WorkflowStatus.AWAITING_REQUIREMENTS_APPROVAL:
        return "approve_requirements"
    elif status == WorkflowStatus.AWAITING_CPM_APPROVAL:
        return "approve_cpm"
    elif status == WorkflowStatus.BUILDING_CPM:
        return "build_cpm"
    elif status == WorkflowStatus.BUILDING_ARCHITECTURE:
        return "build_architecture"
    elif status == WorkflowStatus.AWAITING_ARCHITECTURE_APPROVAL:
        return "approve_architecture"
    elif status == WorkflowStatus.BUILDING_DATABASE:
        return "build_database"
    elif status == WorkflowStatus.AWAITING_DATABASE_APPROVAL:
        return "approve_database"
    elif status == WorkflowStatus.BUILDING_API:
        return "build_api"
    elif status == WorkflowStatus.AWAITING_API_APPROVAL:
        return "approve_api"
    else:
        return "validate_prd"

# 3. Graph Assembly

workflow = StateGraph(WorkflowState)

# Add nodes
workflow.add_node("validate_prd", validate_prd_node)
workflow.add_node("requirements_extraction", requirements_extraction)
workflow.add_node("build_cpm", build_cpm)
workflow.add_node("approve_cpm", approve_cpm)
workflow.add_node("build_architecture", build_architecture)
workflow.add_node("approve_architecture", approve_architecture)
workflow.add_node("build_database", build_database)
workflow.add_node("approve_database", approve_database)
workflow.add_node("build_api", build_api)
workflow.add_node("approve_api", approve_api)
workflow.add_node("generate_requirements", generate_requirements_node)
workflow.add_node("approve_requirements", approve_requirements_node)
workflow.add_node("intervention", intervention_node)

# Configure edges & routing
workflow.add_conditional_edges(START, route_from_start, ["validate_prd", "intervention"])

workflow.add_conditional_edges(
    "validate_prd", 
    route_after_validation, 
    ["validate_prd", "requirements_extraction", "intervention"]
)

# CPM sequential flow
workflow.add_edge("requirements_extraction", "build_cpm")
workflow.add_edge("build_cpm", "approve_cpm")

workflow.add_conditional_edges(
    "approve_cpm",
    route_after_cpm_approval,
    ["build_cpm", "build_architecture", "intervention"]
)

# Architecture flow
workflow.add_edge("build_architecture", "approve_architecture")

workflow.add_conditional_edges(
    "approve_architecture",
    route_after_architecture_approval,
    ["build_architecture", "build_database", "intervention"]
)

# Database flow
workflow.add_edge("build_database", "approve_database")

workflow.add_conditional_edges(
    "approve_database",
    route_after_database_approval,
    ["build_database", "build_api", "intervention"]
)

# API flow
workflow.add_edge("build_api", "approve_api")

workflow.add_conditional_edges(
    "approve_api",
    route_after_api_approval,
    ["build_api", "generate_requirements", "intervention"]
)

workflow.add_conditional_edges(
    "generate_requirements", 
    route_after_generation, 
    ["approve_requirements", "intervention"]
)

workflow.add_conditional_edges(
    "approve_requirements", 
    route_after_approval, 
    ["generate_requirements", "intervention", END]
)

workflow.add_conditional_edges(
    "intervention", 
    route_after_intervention, 
    [
        "validate_prd", 
        "build_cpm", 
        "approve_cpm", 
        "build_architecture", 
        "approve_architecture", 
        "build_database",
        "approve_database",
        "build_api",
        "approve_api",
        "generate_requirements", 
        "approve_requirements"
    ]
)

# Use persistent SQLite checkpointing for state persistence & resumes
conn = sqlite3.connect("checkpoints.db", check_same_thread=False)
memory = SqliteSaver(conn)
memory.setup()
app = workflow.compile(checkpointer=memory)
