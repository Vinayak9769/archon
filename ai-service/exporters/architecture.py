"""
Architecture Exporters

Exports ArchitectureModel to:
  - Mermaid graph diagram (architecture.mmd)
  - Formatted JSON (architecture.json)
"""
import json
from state import ArchitectureModel


def _sanitize_node(name: str) -> str:
    """Convert a name to a valid Mermaid node identifier."""
    return name.replace(" ", "_").replace("-", "_").replace(".", "_").replace("/", "_")


def export_architecture_mermaid(architecture_model: ArchitectureModel) -> str:
    """
    Generate a Mermaid graph TD diagram from an ArchitectureModel.
    If system_diagram is already generated, return it. Otherwise, fallback
    to deterministic generation.
    """
    if getattr(architecture_model, "system_diagram", None):
        return architecture_model.system_diagram

    lines: list[str] = ["graph TD"]

    # ── Services ────────────────────────────────────────────────────────────
    service_ids: list[str] = []
    for svc in architecture_model.services:
        node_id = _sanitize_node(svc.name)
        service_ids.append(node_id)
        lines.append(f'    {node_id}["{svc.name}"]')

    # ── Datastores ──────────────────────────────────────────────────────────
    datastore_ids: list[str] = []
    for ds in architecture_model.datastores:
        node_id = _sanitize_node(ds.name)
        datastore_ids.append(node_id)
        lines.append(f'    {node_id}[("{ds.name}")]')

    # ── External Integrations ────────────────────────────────────────────────
    integration_ids: list[str] = []
    for intg in architecture_model.external_integrations:
        node_id = _sanitize_node(intg.name)
        integration_ids.append(node_id)
        lines.append(f'    {node_id}{{"{intg.name}"}}')

    # ── Queues ───────────────────────────────────────────────────────────────
    queue_ids: list[str] = []
    for q in architecture_model.queues:
        node_id = _sanitize_node(q.name)
        queue_ids.append(node_id)
        lines.append(f'    {node_id}>"{q.name}"]')

    lines.append("")

    # ── Service → Datastore edges ────────────────────────────────────────────
    # Heuristic: link every service to every datastore (common for monolithic/simple layouts).
    # For a more precise graph, the model would need explicit service-datastore mappings.
    for svc in architecture_model.services:
        svc_id = _sanitize_node(svc.name)
        for ds in architecture_model.datastores:
            ds_id = _sanitize_node(ds.name)
            lines.append(f"    {svc_id} --> {ds_id}")

    # ── Service → Integration edges ──────────────────────────────────────────
    for svc in architecture_model.services:
        svc_id = _sanitize_node(svc.name)
        for intg in architecture_model.external_integrations:
            intg_id = _sanitize_node(intg.name)
            lines.append(f"    {svc_id} --> {intg_id}")

    # ── Queue edges: producer → queue → consumer ─────────────────────────────
    for q in architecture_model.queues:
        q_id = _sanitize_node(q.name)
        prod_id = _sanitize_node(q.producer)
        cons_id = _sanitize_node(q.consumer)
        lines.append(f"    {prod_id} --> {q_id}")
        lines.append(f"    {q_id} --> {cons_id}")

    # ── Styling ───────────────────────────────────────────────────────────────
    lines.append("")
    for node_id in datastore_ids:
        lines.append(f"    style {node_id} fill:#1a1a2e,stroke:#4f46e5,color:#a5b4fc")
    for node_id in integration_ids:
        lines.append(f"    style {node_id} fill:#0f2027,stroke:#10b981,color:#6ee7b7")
    for node_id in queue_ids:
        lines.append(f"    style {node_id} fill:#1a0a00,stroke:#f59e0b,color:#fcd34d")

    return "\n".join(lines) + "\n"


def export_architecture_json(architecture_model: ArchitectureModel) -> str:
    """
    Serialize the ArchitectureModel as formatted JSON.
    Uses Pydantic's model_dump for deterministic field ordering.
    """
    return json.dumps(architecture_model.model_dump(), indent=2, ensure_ascii=False) + "\n"
