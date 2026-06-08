"""
Bundle Exporter

Creates a ZIP archive containing all generated artifacts:
  - architecture.mmd
  - architecture.json
  - schema.sql
  - schema.dbml
  - openapi.yaml
  - project_model.json
  - summary.md
"""
import io
import os
import tempfile
import zipfile
from dataclasses import dataclass, field
from typing import Optional

from state import ProjectModel, ArchitectureModel, DatabaseModel, OpenAPIModel

from .architecture import export_architecture_mermaid, export_architecture_json
from .database import export_sql_schema, export_dbml
from .openapi import export_openapi_yaml
from .project import export_project_model_json, export_summary_markdown


@dataclass
class ExportedFile:
    """Represents a single file within the export bundle."""
    filename: str
    content: str
    size_bytes: int = field(init=False)

    def __post_init__(self) -> None:
        self.size_bytes = len(self.content.encode("utf-8"))


@dataclass
class ExportBundle:
    """Result of export_project_bundle."""
    files: list[ExportedFile]
    zip_bytes: bytes          # In-memory ZIP content
    zip_path: Optional[str]   # Path to written ZIP file (if write_to_disk=True)
    total_size_bytes: int = field(init=False)

    def __post_init__(self) -> None:
        self.total_size_bytes = sum(f.size_bytes for f in self.files)


def export_project_bundle(
    project_model: Optional[ProjectModel],
    architecture_model: Optional[ArchitectureModel],
    database_model: Optional[DatabaseModel],
    openapi_model: Optional[OpenAPIModel],
    *,
    write_to_disk: bool = False,
    output_dir: Optional[str] = None,
) -> ExportBundle:
    """
    Generate all artifact files and bundle them into an in-memory ZIP.

    Args:
        project_model:       The CPM / project model.
        architecture_model:  The architecture model.
        database_model:      The database schema model.
        openapi_model:       The OpenAPI specification model.
        write_to_disk:       If True, also write the ZIP to a temp file and set zip_path.
        output_dir:          Directory for the written ZIP (defaults to system temp).

    Returns:
        ExportBundle with all generated files and the ZIP archive bytes.
    """
    exported_files: list[ExportedFile] = []

    # ── Architecture ─────────────────────────────────────────────────────────
    if architecture_model is not None:
        exported_files.append(ExportedFile(
            filename="architecture.mmd",
            content=export_architecture_mermaid(architecture_model),
        ))
        exported_files.append(ExportedFile(
            filename="architecture.json",
            content=export_architecture_json(architecture_model),
        ))
    else:
        exported_files.append(ExportedFile(
            filename="architecture.mmd",
            content="graph TD\n    NotYetGenerated[Architecture not yet generated]\n",
        ))
        exported_files.append(ExportedFile(
            filename="architecture.json",
            content="{}\n",
        ))

    # ── Database ─────────────────────────────────────────────────────────────
    if database_model is not None:
        exported_files.append(ExportedFile(
            filename="schema.sql",
            content=export_sql_schema(database_model),
        ))
        exported_files.append(ExportedFile(
            filename="schema.dbml",
            content=export_dbml(database_model),
        ))
    else:
        exported_files.append(ExportedFile(
            filename="schema.sql",
            content="-- Database schema not yet generated\n",
        ))
        exported_files.append(ExportedFile(
            filename="schema.dbml",
            content="// Database schema not yet generated\n",
        ))

    # ── OpenAPI ───────────────────────────────────────────────────────────────
    if openapi_model is not None:
        exported_files.append(ExportedFile(
            filename="openapi.yaml",
            content=export_openapi_yaml(openapi_model),
        ))
    else:
        exported_files.append(ExportedFile(
            filename="openapi.yaml",
            content="# OpenAPI specification not yet generated\nopenapi: '3.1.0'\ninfo:\n  title: Not yet generated\n  version: '0.0.0'\npaths: {}\n",
        ))

    # ── Project Model ─────────────────────────────────────────────────────────
    if project_model is not None:
        exported_files.append(ExportedFile(
            filename="project_model.json",
            content=export_project_model_json(project_model),
        ))
    else:
        exported_files.append(ExportedFile(
            filename="project_model.json",
            content="{}\n",
        ))

    # ── Summary Markdown ──────────────────────────────────────────────────────
    exported_files.append(ExportedFile(
        filename="summary.md",
        content=export_summary_markdown(
            project_model,
            architecture_model,
            database_model,
            openapi_model,
        ),
    ))

    # ── Build In-Memory ZIP ───────────────────────────────────────────────────
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for ef in exported_files:
            zf.writestr(ef.filename, ef.content.encode("utf-8"))

    zip_bytes = zip_buffer.getvalue()

    # ── Optionally write to disk ──────────────────────────────────────────────
    zip_path: Optional[str] = None
    if write_to_disk:
        dest_dir = output_dir or tempfile.gettempdir()
        os.makedirs(dest_dir, exist_ok=True)
        zip_path = os.path.join(dest_dir, "archon_artifacts.zip")
        with open(zip_path, "wb") as fp:
            fp.write(zip_bytes)

    return ExportBundle(
        files=exported_files,
        zip_bytes=zip_bytes,
        zip_path=zip_path,
    )
