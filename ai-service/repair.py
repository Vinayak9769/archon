"""
Validation-Repair Pipeline
==========================
Implements the validate → classify → repair → re-validate loop for architecture,
database, and API artifacts. Users only see the final repaired artifact.
"""
import json
from typing import List, Optional, Union, Any
from pydantic import BaseModel, Field
from llm import LLMClient
from state import (
    FindingSeverity,
    ProjectModel, ArchitectureModel, DatabaseModel, OpenAPIModel,
    ArchitectureValidationResult, ArchitectureValidationErrorWarning, ArchitectureValidationRecommendation,
    DatabaseValidationResult, DatabaseValidationErrorWarning, DatabaseValidationRecommendation,
    OpenAPIValidationResult, OpenAPIValidationErrorWarning, OpenAPIValidationRecommendation,
)

# ── Constants ────────────────────────────────────────────────────────────────────
DEFAULT_SCORE_THRESHOLD = 85
DEFAULT_MAX_ITERATIONS = 3

# Deterministic severity overrides by finding type
_SEVERITY_OVERRIDES = {
    # BLOCKER — must be fixed
    "missing_primary_key": FindingSeverity.BLOCKER,
    "entity_missing_table": FindingSeverity.BLOCKER,
    "multiple_primary_keys": FindingSeverity.BLOCKER,
    # HIGH — should be fixed
    "integration_missing": FindingSeverity.HIGH,
    "relationship_missing": FindingSeverity.HIGH,
    "service_missing": FindingSeverity.HIGH,
    "invalid_method": FindingSeverity.HIGH,
    "ownership_missing": FindingSeverity.HIGH,
    "entity_missing": FindingSeverity.HIGH,
    # MEDIUM
    "missing_index": FindingSeverity.MEDIUM,
    "missing_fk": FindingSeverity.MEDIUM,
    "ownership_conflict": FindingSeverity.MEDIUM,
    # LOW — advisory
    "scalability_concern": FindingSeverity.LOW,
    "caching_suggestion": FindingSeverity.LOW,
    "sharding_suggestion": FindingSeverity.LOW,
}

# ── Helpers ──────────────────────────────────────────────────────────────────────

def _to_json_str(obj: Any) -> str:
    if hasattr(obj, "model_dump_json"):
        return obj.model_dump_json(indent=2)
    elif hasattr(obj, "model_dump"):
        return json.dumps(obj.model_dump(), indent=2)
    return json.dumps(obj, indent=2)


def classify_severity(finding_type: str) -> str:
    """Classify a finding's severity using deterministic overrides."""
    t = finding_type.lower().strip()
    if t in _SEVERITY_OVERRIDES:
        return _SEVERITY_OVERRIDES[t].value
    # Heuristic: anything with "missing" in the type is at least HIGH
    if "missing" in t:
        return FindingSeverity.HIGH.value
    return FindingSeverity.MEDIUM.value


def _is_actionable(severity: str) -> bool:
    """Only BLOCKER and HIGH findings trigger repair."""
    return severity in (FindingSeverity.BLOCKER.value, FindingSeverity.HIGH.value)


def _finding_fingerprint(finding: Any) -> str:
    """Create a dedup key from a finding's type + affected_item."""
    t = getattr(finding, "type", "")
    a = getattr(finding, "affected_item", "")
    return f"{t}::{a}"


def _classify_findings_on_result(validation_result):
    """Annotate severity on each error/warning in a validation result in-place."""
    for err in validation_result.errors:
        err.severity = classify_severity(err.type)
    for warn in validation_result.warnings:
        if not hasattr(warn, "severity") or warn.severity == "MEDIUM":
            warn.severity = classify_severity(warn.type)


def _get_actionable_findings(validation_result) -> list:
    """Return only BLOCKER/HIGH findings from errors + warnings."""
    actionable = []
    for err in validation_result.errors:
        if _is_actionable(getattr(err, "severity", "MEDIUM")):
            actionable.append(err)
    for warn in validation_result.warnings:
        if _is_actionable(getattr(warn, "severity", "MEDIUM")):
            actionable.append(warn)
    return actionable


def _findings_fingerprints(validation_result) -> set:
    """Collect fingerprints of all actionable findings."""
    fps = set()
    for f in _get_actionable_findings(validation_result):
        fps.add(_finding_fingerprint(f))
    return fps


# ── Repair Agents ────────────────────────────────────────────────────────────────

def repair_architecture_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    actionable_findings: list,
    iteration: int,
    current_score: int,
    client: LLMClient,
    model: Optional[str] = None,
) -> ArchitectureModel:
    """Repair an ArchitectureModel to resolve BLOCKER/HIGH validation findings."""
    findings_text = "\n".join(
        f"- [{f.severity}] ({f.type}) {f.message} [affects: {f.affected_item}]"
        for f in actionable_findings
    )

    system_instruction = (
        "You are an expert Systems Architect performing targeted repairs.\n"
        "You will receive an ArchitectureModel and a list of validation findings that MUST be resolved.\n\n"
        "RULES:\n"
        "1. Make MINIMAL changes to resolve each finding.\n"
        "2. PRESERVE all existing valid services, datastores, integrations, queues.\n"
        "3. Do NOT remove components unless they are duplicates.\n"
        "4. Do NOT change the architecture_pattern.\n"
        "5. Add missing services, integrations, or security elements as needed.\n"
        "6. Ensure entity ownership is complete after repair.\n"
        "7. Return a complete, valid ArchitectureModel (not a partial diff).\n\n"
        "You are on repair iteration {iteration} with current score {score}."
    ).format(iteration=iteration, score=current_score)

    prompt = (
        f"Current ArchitectureModel:\n{_to_json_str(architecture_model)}\n\n"
        f"ProjectModel (CPM) for reference:\n{_to_json_str(project_model)}\n\n"
        f"VALIDATION FINDINGS TO RESOLVE:\n{findings_text}\n\n"
        "Return the repaired ArchitectureModel with all findings addressed."
    )

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=ArchitectureModel,
        model=model,
    )


def repair_database_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    actionable_findings: list,
    iteration: int,
    current_score: int,
    client: LLMClient,
    model: Optional[str] = None,
) -> DatabaseModel:
    """Repair a DatabaseModel to resolve BLOCKER/HIGH validation findings."""
    findings_text = "\n".join(
        f"- [{f.severity}] ({f.type}) {f.message} [affects: {f.affected_item}]"
        for f in actionable_findings
    )

    system_instruction = (
        "You are an expert Database Architect performing targeted repairs.\n"
        "You will receive a DatabaseModel and validation findings that MUST be resolved.\n\n"
        "RULES:\n"
        "1. Make MINIMAL changes to resolve each finding.\n"
        "2. PRESERVE all existing valid tables, columns, relationships, indexes.\n"
        "3. Do NOT remove valid tables or columns.\n"
        "4. Add missing tables, columns, primary keys, foreign keys, or relationships as needed.\n"
        "5. Fix data type issues (e.g. use UUID for IDs, TIMESTAMPTZ for timestamps).\n"
        "6. Ensure every table has exactly one primary key column.\n"
        "7. Return a complete, valid DatabaseModel (not a partial diff).\n\n"
        "You are on repair iteration {iteration} with current score {score}."
    ).format(iteration=iteration, score=current_score)

    prompt = (
        f"Current DatabaseModel:\n{_to_json_str(database_model)}\n\n"
        f"ProjectModel (CPM):\n{_to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{_to_json_str(architecture_model)}\n\n"
        f"VALIDATION FINDINGS TO RESOLVE:\n{findings_text}\n\n"
        "Return the repaired DatabaseModel with all findings addressed."
    )

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=DatabaseModel,
        model=model,
    )


def repair_openapi_agent(
    project_model: ProjectModel,
    architecture_model: ArchitectureModel,
    database_model: DatabaseModel,
    openapi_model: OpenAPIModel,
    actionable_findings: list,
    iteration: int,
    current_score: int,
    client: LLMClient,
    model: Optional[str] = None,
) -> OpenAPIModel:
    """Repair an OpenAPIModel to resolve BLOCKER/HIGH validation findings."""
    findings_text = "\n".join(
        f"- [{f.severity}] ({f.type}) {f.message} [affects: {f.affected_item}]"
        for f in actionable_findings
    )

    system_instruction = (
        "You are an expert API Architect performing targeted repairs.\n"
        "You will receive an OpenAPIModel and validation findings that MUST be resolved.\n\n"
        "RULES:\n"
        "1. Make MINIMAL changes to resolve each finding.\n"
        "2. PRESERVE all existing valid endpoints.\n"
        "3. Do NOT remove endpoints unless they are invalid duplicates.\n"
        "4. Add missing endpoints, fix service ownership, add missing schemas.\n"
        "5. Ensure request/response schemas have proper name and properties.\n"
        "6. Ensure authentication flags match architecture security requirements.\n"
        "7. Ensure payload generation is complete: for every endpoint, generate a realistic, formatted, mock JSON example payload string for `request_body` and `response_body` matching the respective schemas.\n"
        "8. Return a complete, valid OpenAPIModel (not a partial diff).\n\n"
        "You are on repair iteration {iteration} with current score {score}."
    ).format(iteration=iteration, score=current_score)

    prompt = (
        f"Current OpenAPIModel:\n{_to_json_str(openapi_model)}\n\n"
        f"ProjectModel (CPM):\n{_to_json_str(project_model)}\n\n"
        f"ArchitectureModel:\n{_to_json_str(architecture_model)}\n\n"
        f"DatabaseModel:\n{_to_json_str(database_model)}\n\n"
        f"VALIDATION FINDINGS TO RESOLVE:\n{findings_text}\n\n"
        "Return the repaired OpenAPIModel with all findings addressed."
    )

    return client.generate(
        prompt=prompt,
        system_instruction=system_instruction,
        response_model=OpenAPIModel,
        model=model,
    )


# ── Core Repair Loop ─────────────────────────────────────────────────────────────

def run_repair_loop(
    artifact_type: str,
    artifact,
    project_model: ProjectModel,
    client: LLMClient,
    model: Optional[str] = None,
    architecture_model: Optional[ArchitectureModel] = None,
    database_model: Optional[DatabaseModel] = None,
    validate_fn=None,
    validate_kwargs: Optional[dict] = None,
    score_threshold: int = DEFAULT_SCORE_THRESHOLD,
    max_iterations: int = DEFAULT_MAX_ITERATIONS,
):
    """
    Run the validate → repair → re-validate loop.

    Args:
        artifact_type: "architecture", "database", or "openapi"
        artifact: The generated model to validate and repair
        project_model: CPM
        client: LLM client
        model: LLM model name
        architecture_model: Required for database/openapi repair
        database_model: Required for openapi repair
        validate_fn: The validation agent function
        validate_kwargs: Extra kwargs for validate_fn
        score_threshold: Stop repairing if score >= this
        max_iterations: Maximum repair iterations

    Returns:
        The repaired artifact with validation fields populated.
    """
    validate_kwargs = validate_kwargs or {}
    resolved_findings: list[str] = []
    prev_score = -1
    plateau_count = 0
    prev_fingerprints: set = set()

    for iteration in range(max_iterations):
        iter_num = iteration + 1
        print(f"\n[RepairLoop] {artifact_type} — iteration {iter_num}/{max_iterations}")

        # ── Step 1: Validate ─────────────────────────────────────────────────
        try:
            validation_result = validate_fn(
                project_model=project_model,
                client=client,
                model=model,
                **validate_kwargs,
            )
        except Exception as e:
            print(f"[RepairLoop] Validation failed on iteration {iter_num}: {e}")
            break

        # ── Step 2: Classify severity ────────────────────────────────────────
        _classify_findings_on_result(validation_result)
        current_score = validation_result.score
        print(f"[RepairLoop] Score: {current_score}, Errors: {len(validation_result.errors)}, Warnings: {len(validation_result.warnings)}")

        # ── Step 3: Check exit conditions ────────────────────────────────────
        actionable = _get_actionable_findings(validation_result)

        # 3a. Score above threshold
        if current_score >= score_threshold:
            print(f"[RepairLoop] Score {current_score} >= threshold {score_threshold}. Done.")
            _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
            break

        # 3b. No actionable findings
        if not actionable:
            print(f"[RepairLoop] No BLOCKER/HIGH findings remain. Done.")
            _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
            break

        # 3c. Last iteration — no more repairs
        if iter_num >= max_iterations:
            print(f"[RepairLoop] Max iterations reached. Returning best effort.")
            _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
            break

        # 3d. Score plateau detection
        if current_score <= prev_score:
            plateau_count += 1
            if plateau_count >= 2:
                print(f"[RepairLoop] Score plateau detected (no improvement for 2 iterations). Done.")
                _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
                break
        else:
            plateau_count = 0

        # 3e. Duplicate finding detection
        current_fingerprints = _findings_fingerprints(validation_result)
        if current_fingerprints and current_fingerprints == prev_fingerprints:
            print(f"[RepairLoop] Same findings as previous iteration. Done.")
            _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
            break

        prev_score = current_score
        prev_fingerprints = current_fingerprints

        # ── Step 4: Repair ───────────────────────────────────────────────────
        print(f"[RepairLoop] Repairing {len(actionable)} actionable findings...")

        # Track what we're repairing
        for f in actionable:
            resolved_findings.append(f"[{f.severity}] {f.message}")

        try:
            if artifact_type == "architecture":
                artifact = repair_architecture_agent(
                    project_model=project_model,
                    architecture_model=artifact,
                    actionable_findings=actionable,
                    iteration=iter_num,
                    current_score=current_score,
                    client=client,
                    model=model,
                )
                # Update validate_kwargs for next iteration
                validate_kwargs["architecture_model"] = artifact

            elif artifact_type == "database":
                artifact = repair_database_agent(
                    project_model=project_model,
                    architecture_model=architecture_model,
                    database_model=artifact,
                    actionable_findings=actionable,
                    iteration=iter_num,
                    current_score=current_score,
                    client=client,
                    model=model,
                )
                validate_kwargs["database_model"] = artifact

            elif artifact_type == "openapi":
                artifact = repair_openapi_agent(
                    project_model=project_model,
                    architecture_model=architecture_model,
                    database_model=database_model,
                    openapi_model=artifact,
                    actionable_findings=actionable,
                    iteration=iter_num,
                    current_score=current_score,
                    client=client,
                    model=model,
                )
                validate_kwargs["openapi_model"] = artifact

        except Exception as e:
            print(f"[RepairLoop] Repair failed on iteration {iter_num}: {e}")
            # Apply the last validation result and stop
            _apply_validation_to_artifact(artifact, validation_result, resolved_findings)
            break
    else:
        # Loop completed without breaking — apply final validation
        print(f"[RepairLoop] Loop exhausted. Applying final state.")

    return artifact


def _apply_validation_to_artifact(artifact, validation_result, resolved_findings: list):
    """Write validation results + resolved findings back onto the artifact model."""
    artifact.score = validation_result.score
    artifact.errors = validation_result.errors
    artifact.warnings = validation_result.warnings
    artifact.recommendations = validation_result.recommendations
    artifact.resolved_findings = resolved_findings
