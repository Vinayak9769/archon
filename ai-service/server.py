"""
Archon AI Service — gRPC Server

Thin transport layer that exposes the LangGraph workflow engine
over gRPC so the Go gateway can start, resume, and poll workflows.
"""

import asyncio
import json
import logging
import sys

import grpc
from grpc import aio

from generated import archon_pb2, archon_pb2_grpc
from graph import app
from state import WorkflowStatus
from langgraph.types import Command
from exporters import ArtifactExportService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

GRPC_PORT = 50051


def _serialize(obj) -> str:
    """Serialize a Pydantic model or dict to JSON string."""
    if obj is None:
        return ""
    if hasattr(obj, "model_dump_json"):
        return obj.model_dump_json()
    if hasattr(obj, "model_dump"):
        return json.dumps(obj.model_dump())
    if isinstance(obj, dict):
        return json.dumps(obj)
    return str(obj)


def _serialize_status(status) -> str:
    """Safely serialize WorkflowStatus enum to its string value."""
    if status is None:
        return ""
    if hasattr(status, "value"):
        return str(status.value)
    status_str = str(status)
    if status_str.startswith("WorkflowStatus."):
        return status_str.split("WorkflowStatus.")[1].lower()
    return status_str.lower()


def _get_interrupt_info(thread_id: str) -> tuple[str, str]:
    """
    Inspect the graph state to determine if it is paused on an interrupt.
    Returns (interrupt_type, interrupt_payload_json).
    """
    config = {"configurable": {"thread_id": thread_id}}
    graph_state = app.get_state(config)

    if not graph_state or not graph_state.tasks:
        return "", ""

    # Check for pending interrupts
    for task in graph_state.tasks:
        if hasattr(task, "interrupts") and task.interrupts:
            interrupt_val = task.interrupts[0].value
            if isinstance(interrupt_val, dict):
                interrupt_type = interrupt_val.get("type", "unknown")
                return interrupt_type, json.dumps(interrupt_val)
            return "unknown", json.dumps({"value": str(interrupt_val)})

    return "", ""


class ArchonAIServicer(archon_pb2_grpc.ArchonAIServicer):
    """Implements the ArchonAI gRPC service."""

    def StartWorkflow(self, request, context):
        """Create a new LangGraph thread and kick off the workflow."""
        import uuid

        thread_id = f"thread-{uuid.uuid4().hex[:12]}"
        config = {"configurable": {"thread_id": thread_id}}

        initial_state = {
            "prd": request.prd,
            "provider": request.provider or "gemini",
            "model": request.model or None,
            "validation_status": "pending",
            "validation_findings": None,
            "validation_questions": [],
            "clarification_responses": {},
            "clarifications": None,
            "requirements_doc": None,
            "approved": None,
            "approval_feedback": None,
            "intervention_requested": False,
            "intervention_log": [],
            "status": WorkflowStatus.VALIDATING,
            "project_model": None,
            "cpm_approved": None,
            "cpm_feedback": None,
            "architecture_model": None,
            "architecture_feedback": None,
            "architecture_approved": None,
            "database_model": None,
            "database_feedback": None,
            "database_approved": None,
            "extracted_requirements": None,
        }

        logger.info(f"StartWorkflow: thread={thread_id}, provider={request.provider}")

        # Run the graph until first interrupt or completion
        try:
            for event in app.stream(initial_state, config, stream_mode="updates"):
                logger.info(f"  [{thread_id}] node event: {list(event.keys())}")
        except Exception as e:
            logger.error(f"  [{thread_id}] error during initial run: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return archon_pb2.StartWorkflowResponse()

        # Read final status
        graph_state = app.get_state(config)
        status = _serialize_status(graph_state.values.get("status", "unknown"))

        logger.info(f"  [{thread_id}] paused/finished at status={status}")

        return archon_pb2.StartWorkflowResponse(
            thread_id=thread_id,
            status=status,
        )

    def ResumeWorkflow(self, request, context):
        """Resume a paused workflow with a HITL response."""
        thread_id = request.thread_id
        action = request.action
        config = {"configurable": {"thread_id": thread_id}}

        logger.info(f"ResumeWorkflow: thread={thread_id}, action={action}")

        # Parse the incoming payload
        try:
            payload = json.loads(request.payload) if request.payload else {}
        except json.JSONDecodeError:
            payload = {"raw": request.payload}

        # Build the resume value based on the action type.
        # NOTE: graph approval nodes check user_response.get("action"), so we
        # must use "action" as the key — not "decision".
        if action == "clarification":
            resume_value = payload  # dict of question → answer
        elif action == "approve":
            resume_value = {"action": "approve"}
        elif action == "feedback":
            resume_value = {
                "action": "feedback",
                "feedback": payload.get("feedback", ""),
            }
        elif action == "intervention":
            resume_value = {"__intervention__": True, **payload}
        else:
            resume_value = payload

        # Resume the graph
        try:
            for event in app.stream(
                Command(resume=resume_value), config, stream_mode="updates"
            ):
                logger.info(f"  [{thread_id}] node event: {list(event.keys())}")
        except Exception as e:
            logger.error(f"  [{thread_id}] error during resume: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return archon_pb2.ResumeWorkflowResponse()

        # Read updated status
        graph_state = app.get_state(config)
        status = _serialize_status(graph_state.values.get("status", "unknown"))

        logger.info(f"  [{thread_id}] resumed to status={status}")

        return archon_pb2.ResumeWorkflowResponse(status=status)

    def GetWorkflowState(self, request, context):
        """Return the full current state snapshot for a thread."""
        thread_id = request.thread_id
        config = {"configurable": {"thread_id": thread_id}}

        graph_state = app.get_state(config)
        if not graph_state or not graph_state.values:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"No workflow found for thread {thread_id}")
            return archon_pb2.GetWorkflowStateResponse()

        vals = graph_state.values
        interrupt_type, interrupt_payload = _get_interrupt_info(thread_id)

        return archon_pb2.GetWorkflowStateResponse(
            thread_id=thread_id,
            status=_serialize_status(vals.get("status", "")),
            prd=vals.get("prd", ""),
            provider=vals.get("provider", ""),
            project_model=_serialize(vals.get("project_model")),
            architecture_model=_serialize(vals.get("architecture_model")),
            database_model=_serialize(vals.get("database_model")),
            openapi_model=_serialize(vals.get("openapi_model")),
            requirements_doc=vals.get("requirements_doc", "") or "",
            interrupt_type=interrupt_type,
            interrupt_payload=interrupt_payload,
            backlog_model=_serialize(vals.get("backlog_model")),
        )

    def ExportArtifacts(self, request, context):
        """Generate all design artifacts from raw model JSON blobs and return a ZIP bundle."""
        svc = ArtifactExportService()
        try:
            result = svc.export(
                project_model_json=request.project_model_json or None,
                architecture_model_json=request.architecture_model_json or None,
                database_model_json=request.database_model_json or None,
                openapi_model_json=request.openapi_model_json or None,
            )
        except Exception as e:
            logger.error(f"ExportArtifacts failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return archon_pb2.ExportArtifactsResponse()

        bundle = result.bundle
        meta = result.metadata

        pb_files = [
            archon_pb2.ExportedFile(
                filename=f.filename,
                content=f.content,
                size_bytes=f.size_bytes,
            )
            for f in bundle.files
        ]

        return archon_pb2.ExportArtifactsResponse(
            files=pb_files,
            zip_bytes=bundle.zip_bytes,
            total_size_bytes=meta.total_size_bytes,
            had_project_model=meta.had_project_model,
            had_architecture_model=meta.had_architecture_model,
            had_database_model=meta.had_database_model,
            had_openapi_model=meta.had_openapi_model,
        )

    def GenerateBacklog(self, request, context):
        """Generate an implementation backlog from all design artifacts."""
        thread_id = request.thread_id
        feedback = request.feedback or None
        config = {"configurable": {"thread_id": thread_id}}

        logger.info(f"GenerateBacklog: thread={thread_id}")

        # Get current workflow state
        graph_state = app.get_state(config)
        if not graph_state or not graph_state.values:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"No workflow found for thread {thread_id}")
            return archon_pb2.GenerateBacklogResponse()

        vals = graph_state.values

        # Deserialize models from state
        from state import ProjectModel, ArchitectureModel, DatabaseModel, OpenAPIModel
        from agents import generate_backlog_agent
        from llm import LLMClient

        project_model = vals.get("project_model")
        architecture_model = vals.get("architecture_model")
        database_model = vals.get("database_model")
        openapi_model = vals.get("openapi_model")

        if not all([project_model, architecture_model, database_model, openapi_model]):
            context.set_code(grpc.StatusCode.FAILED_PRECONDITION)
            context.set_details("All design artifacts must be generated before creating a backlog")
            return archon_pb2.GenerateBacklogResponse()

        try:
            provider = vals.get("provider", "gemini")
            model = vals.get("model")
            client = LLMClient(provider=provider)

            backlog = generate_backlog_agent(
                project_model=project_model,
                architecture_model=architecture_model,
                database_model=database_model,
                openapi_model=openapi_model,
                client=client,
                feedback=feedback,
                model=model,
            )

            # Persist backlog into workflow state
            app.update_state(config, {"backlog_model": backlog})

            return archon_pb2.GenerateBacklogResponse(
                backlog_model=_serialize(backlog),
            )
        except Exception as e:
            logger.error(f"GenerateBacklog failed: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return archon_pb2.GenerateBacklogResponse()


def serve():
    """Start the gRPC server."""
    from concurrent.futures import ThreadPoolExecutor
    server = grpc.server(
        ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.max_send_message_length", 100 * 1024 * 1024),  # 100 MB
            ("grpc.max_receive_message_length", 100 * 1024 * 1024),
        ],
    )
    archon_pb2_grpc.add_ArchonAIServicer_to_server(ArchonAIServicer(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()

    logger.info(f"Archon AI gRPC server listening on port {GRPC_PORT}")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down gRPC server...")
        server.stop(grace=5)


if __name__ == "__main__":
    serve()
