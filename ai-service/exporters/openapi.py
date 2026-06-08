"""
OpenAPI Exporter

Exports OpenAPIModel to OpenAPI 3.1 YAML (openapi.yaml).
Uses deterministic PyYAML serialization (sort_keys=True).
"""
import json
from typing import Any
import yaml

from state import OpenAPIModel, Endpoint, Parameter, RequestSchema, ResponseSchema


def _map_type(raw_type: str) -> dict[str, Any]:
    """Map a free-form type string to a JSON Schema type object."""
    t = raw_type.strip().lower()
    mapping: dict[str, dict[str, Any]] = {
        "string":    {"type": "string"},
        "str":       {"type": "string"},
        "text":      {"type": "string"},
        "int":       {"type": "integer"},
        "integer":   {"type": "integer"},
        "bigint":    {"type": "integer", "format": "int64"},
        "float":     {"type": "number", "format": "float"},
        "decimal":   {"type": "number"},
        "number":    {"type": "number"},
        "bool":      {"type": "boolean"},
        "boolean":   {"type": "boolean"},
        "uuid":      {"type": "string", "format": "uuid"},
        "datetime":  {"type": "string", "format": "date-time"},
        "timestamp": {"type": "string", "format": "date-time"},
        "date":      {"type": "string", "format": "date"},
        "object":    {"type": "object"},
        "array":     {"type": "array", "items": {"type": "string"}},
        "json":      {"type": "object"},
    }
    if t.startswith("list[") or t.startswith("array["):
        return {"type": "array", "items": {"type": "string"}}
    return mapping.get(t, {"type": "string"})


def _build_schema_object(schema: RequestSchema | ResponseSchema) -> dict[str, Any]:
    """Build an OpenAPI 3.1 schema object from a RequestSchema or ResponseSchema."""
    properties: dict[str, Any] = {}
    for field_name, field_def in schema.properties.items():
        if isinstance(field_def, dict):
            field_type = field_def.get("type", "string")
            field_desc = field_def.get("description", "")
            prop: dict[str, Any] = _map_type(str(field_type))
            if field_desc:
                prop["description"] = field_desc
        elif isinstance(field_def, str):
            prop = _map_type(field_def)
        else:
            prop = {"type": "string"}
        properties[field_name] = prop

    obj: dict[str, Any] = {"type": "object", "properties": properties}
    if hasattr(schema, "required") and schema.required:
        obj["required"] = sorted(schema.required)
    return obj


def _build_parameters(endpoint: Endpoint) -> list[dict[str, Any]]:
    """Build the OpenAPI parameters list for an endpoint."""
    params: list[dict[str, Any]] = []
    for p in sorted(endpoint.parameters, key=lambda x: x.name):
        param_obj: dict[str, Any] = {
            "name":     p.name,
            "in":       p.in_type,
            "required": p.required,
            "schema":   _map_type(p.type),
        }
        if p.description:
            param_obj["description"] = p.description
        params.append(param_obj)
    return params


def _build_operation(endpoint: Endpoint) -> dict[str, Any]:
    """Build the OpenAPI operation object for a single endpoint+method."""
    operation: dict[str, Any] = {
        "summary":  endpoint.summary,
        "tags":     [endpoint.service],
        "operationId": (
            endpoint.method.lower()
            + "_"
            + endpoint.path.strip("/").replace("/", "_").replace("{", "").replace("}", "")
        ),
        "responses": {},
    }

    if endpoint.parameters:
        operation["parameters"] = _build_parameters(endpoint)

    if endpoint.authentication_required:
        operation["security"] = [{"BearerAuth": []}]

    # Request body
    method_upper = endpoint.method.upper()
    if endpoint.request_schema and method_upper in ("POST", "PUT", "PATCH"):
        schema_obj = _build_schema_object(endpoint.request_schema)
        content_obj: dict[str, Any] = {"schema": schema_obj}
        if getattr(endpoint, "request_body", None):
            try:
                content_obj["example"] = json.loads(endpoint.request_body)
            except Exception:
                content_obj["example"] = endpoint.request_body
        operation["requestBody"] = {
            "required": True,
            "content": {
                "application/json": content_obj
            },
        }

    # Success response
    if endpoint.response_schema:
        resp_schema = _build_schema_object(endpoint.response_schema)
        resp_content: dict[str, Any] = {"schema": resp_schema}
        if getattr(endpoint, "response_body", None):
            try:
                resp_content["example"] = json.loads(endpoint.response_body)
            except Exception:
                resp_content["example"] = endpoint.response_body
        success_code = "201" if method_upper == "POST" else "200"
        operation["responses"][success_code] = {
            "description": "Success",
            "content": {"application/json": resp_content},
        }
    else:
        success_code = "204" if method_upper == "DELETE" else "200"
        operation["responses"][success_code] = {"description": "Success"}

    # Common error responses
    if endpoint.authentication_required:
        operation["responses"]["401"] = {"description": "Unauthorized"}
    operation["responses"]["400"] = {"description": "Bad Request"}
    operation["responses"]["500"] = {"description": "Internal Server Error"}

    return operation


def export_openapi_yaml(openapi_model: OpenAPIModel) -> str:
    """
    Generate an OpenAPI 3.1 YAML document from an OpenAPIModel.

    Includes:
      - All paths, methods, parameters
      - Request and response schemas
      - Security scheme (Bearer JWT) when endpoints require auth
    """
    has_auth = any(ep.authentication_required for ep in openapi_model.endpoints)

    spec: dict[str, Any] = {
        "openapi": "3.1.0",
        "info": {
            "title":   "Archon Generated API",
            "version": "1.0.0",
        },
        "paths": {},
    }

    if has_auth:
        spec["components"] = {
            "securitySchemes": {
                "BearerAuth": {
                    "type":   "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                }
            }
        }

    # Group endpoints by path
    paths: dict[str, dict[str, Any]] = {}
    for endpoint in sorted(openapi_model.endpoints, key=lambda e: (e.path, e.method)):
        path = endpoint.path
        method = endpoint.method.lower()
        if path not in paths:
            paths[path] = {}
        paths[path][method] = _build_operation(endpoint)

    spec["paths"] = dict(sorted(paths.items()))

    return yaml.dump(
        spec,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=True,
        indent=2,
    )
