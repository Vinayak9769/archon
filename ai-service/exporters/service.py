"""
ArtifactExportService

Orchestrates all artifact exporters.
Accepts raw JSON strings (as stored in the database/workflow state)
and returns a complete ExportBundle with metadata.

No LLM calls. Pure deterministic generation.
"""
import json
from dataclasses import dataclass
from typing import Optional

from state import ProjectModel, ArchitectureModel, DatabaseModel, OpenAPIModel
from .bundle import ExportBundle, export_project_bundle


@dataclass
class ExportMetadata:
    """Summary metadata returned alongside the bundle."""
    file_count: int
    total_size_bytes: int
    filenames: list[str]
    had_project_model: bool
    had_architecture_model: bool
    had_database_model: bool
    had_openapi_model: bool


@dataclass
class ExportResult:
    bundle: ExportBundle
    metadata: ExportMetadata


class ArtifactExportService:
    """
    Generates all design artifacts from raw JSON model strings.

    Usage::

        svc = ArtifactExportService()
        result = svc.export(
            project_model_json=design.project_model,
            architecture_model_json=design.architecture_model,
            database_model_json=design.database_model,
            openapi_model_json=design.openapi_model,
        )
        zip_bytes = result.bundle.zip_bytes
    """

    @staticmethod
    def _parse_model(raw_json: Optional[str], model_class):
        """Safely deserialize a JSON string into a Pydantic model. Returns None on failure."""
        if not raw_json or not raw_json.strip():
            return None
        try:
            data = json.loads(raw_json)
            return model_class(**data)
        except Exception:
            return None

    def export(
        self,
        *,
        project_model_json: Optional[str] = None,
        architecture_model_json: Optional[str] = None,
        database_model_json: Optional[str] = None,
        openapi_model_json: Optional[str] = None,
        write_to_disk: bool = False,
        output_dir: Optional[str] = None,
    ) -> ExportResult:
        """
        Generate all artifacts from raw JSON model strings.

        Args:
            project_model_json:       Raw JSON string of ProjectModel.
            architecture_model_json:  Raw JSON string of ArchitectureModel.
            database_model_json:      Raw JSON string of DatabaseModel.
            openapi_model_json:       Raw JSON string of OpenAPIModel.
            write_to_disk:            If True, write the ZIP to a temp file.
            output_dir:               Directory for the ZIP file.

        Returns:
            ExportResult with the bundle and export metadata.
        """
        pm = self._parse_model(project_model_json, ProjectModel)
        am = self._parse_model(architecture_model_json, ArchitectureModel)
        dm = self._parse_model(database_model_json, DatabaseModel)
        om = self._parse_model(openapi_model_json, OpenAPIModel)

        bundle = export_project_bundle(
            pm, am, dm, om,
            write_to_disk=write_to_disk,
            output_dir=output_dir,
        )

        metadata = ExportMetadata(
            file_count=len(bundle.files),
            total_size_bytes=bundle.total_size_bytes,
            filenames=[f.filename for f in bundle.files],
            had_project_model=pm is not None,
            had_architecture_model=am is not None,
            had_database_model=dm is not None,
            had_openapi_model=om is not None,
        )

        return ExportResult(bundle=bundle, metadata=metadata)
