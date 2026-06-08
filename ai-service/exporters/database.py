"""
Database Exporters

Exports DatabaseModel to:
  - PostgreSQL-compatible SQL DDL (schema.sql)
  - DBML schema notation (schema.dbml)
"""
from state import DatabaseModel, Table, Column, Constraint, Relationship, Index, RelationshipType


# ─── SQL Exporter ────────────────────────────────────────────────────────────

_SQL_TYPE_MAP: dict[str, str] = {
    "string":    "TEXT",
    "str":       "TEXT",
    "text":      "TEXT",
    "varchar":   "VARCHAR(255)",
    "int":       "INTEGER",
    "integer":   "INTEGER",
    "bigint":    "BIGINT",
    "float":     "NUMERIC(10, 4)",
    "decimal":   "NUMERIC(10, 4)",
    "number":    "NUMERIC(10, 4)",
    "bool":      "BOOLEAN",
    "boolean":   "BOOLEAN",
    "timestamp": "TIMESTAMP WITH TIME ZONE",
    "datetime":  "TIMESTAMP WITH TIME ZONE",
    "date":      "DATE",
    "uuid":      "UUID",
    "json":      "JSONB",
    "jsonb":     "JSONB",
    "bytea":     "BYTEA",
}


def _normalize_sql_type(raw_type: str) -> str:
    """Normalize a free-form type string to a PostgreSQL type."""
    key = raw_type.strip().lower()
    # Handle parameterized forms like VARCHAR(100), NUMERIC(10,2)
    if "(" in key:
        base = key.split("(")[0].strip()
        return _SQL_TYPE_MAP.get(base, raw_type.upper())
    return _SQL_TYPE_MAP.get(key, raw_type.upper())


def _column_ddl(col: Column) -> str:
    """Generate the SQL fragment for a single column."""
    parts: list[str] = [f'    "{col.name}"', _normalize_sql_type(col.type)]
    if col.primary_key:
        parts.append("PRIMARY KEY")
    if not col.nullable and not col.primary_key:
        parts.append("NOT NULL")
    if col.unique and not col.primary_key:
        parts.append("UNIQUE")
    return " ".join(parts)


def _table_ddl(table: Table) -> str:
    """Generate a full CREATE TABLE statement for a table."""
    col_defs = [_column_ddl(col) for col in table.columns]

    # Inline table-level constraints
    for constraint in table.constraints:
        ct = constraint.type.lower()
        if ct in ("unique",):
            col_defs.append(f"    CONSTRAINT {constraint.name} {constraint.definition}")
        elif ct in ("check",):
            col_defs.append(f"    CONSTRAINT {constraint.name} CHECK ({constraint.definition})")
        elif ct in ("foreign_key", "fk"):
            col_defs.append(f"    CONSTRAINT {constraint.name} {constraint.definition}")

    body = ",\n".join(col_defs)
    comment = f"-- {table.description}" if table.description else ""
    lines = []
    if comment:
        lines.append(comment)
    lines.append(f'CREATE TABLE IF NOT EXISTS "{table.name}" (')
    lines.append(body)
    lines.append(");")
    return "\n".join(lines)


def export_sql_schema(database_model: DatabaseModel) -> str:
    """
    Generate a PostgreSQL-compatible SQL DDL script from a DatabaseModel.

    Includes:
      - CREATE TABLE statements with primary keys, NOT NULL, UNIQUE
      - Table-level constraints (CHECK, FK, UNIQUE)
      - CREATE INDEX statements
    """
    sections: list[str] = [
        "-- ============================================================",
        "-- Archon Generated Schema",
        "-- PostgreSQL-compatible DDL",
        "-- ============================================================",
        "",
    ]

    for table in database_model.tables:
        sections.append(_table_ddl(table))
        sections.append("")

    # ── Indexes ────────────────────────────────────────────────────────────
    if database_model.indexes:
        sections.append("-- ── Indexes ─────────────────────────────────────────────")
        for idx in database_model.indexes:
            col_list = ", ".join(f'"{c}"' for c in idx.columns)
            idx_name = f'idx_{idx.table}_{"_".join(idx.columns)}'
            sections.append(f"-- {idx.reason}")
            sections.append(f'CREATE INDEX IF NOT EXISTS "{idx_name}" ON "{idx.table}" ({col_list});')
            sections.append("")

    return "\n".join(sections)


# ─── DBML Exporter ───────────────────────────────────────────────────────────

_DBML_TYPE_MAP: dict[str, str] = {
    "string":    "text",
    "str":       "text",
    "text":      "text",
    "int":       "integer",
    "integer":   "integer",
    "bigint":    "bigint",
    "float":     "float",
    "decimal":   "decimal",
    "number":    "decimal",
    "bool":      "boolean",
    "boolean":   "boolean",
    "timestamp": "timestamp",
    "datetime":  "timestamp",
    "date":      "date",
    "uuid":      "uuid",
    "json":      "json",
    "jsonb":     "json",
}


def _normalize_dbml_type(raw_type: str) -> str:
    key = raw_type.strip().lower()
    if "(" in key:
        key = key.split("(")[0].strip()
    return _DBML_TYPE_MAP.get(key, raw_type.lower())


def _dbml_column(col: Column) -> str:
    notes: list[str] = []
    if col.primary_key:
        notes.append("pk")
    if not col.nullable and not col.primary_key:
        notes.append("not null")
    if col.unique and not col.primary_key:
        notes.append("unique")
    if col.description:
        escaped = col.description.replace("'", "\\'")
        notes.append(f"note: '{escaped}'")
    attr = f" [{', '.join(notes)}]" if notes else ""
    return f'    "{col.name}" {_normalize_dbml_type(col.type)}{attr}'


def _rel_type_dbml(rel_type: RelationshipType) -> str:
    mapping = {
        RelationshipType.ONE_TO_ONE:  "-",
        RelationshipType.ONE_TO_MANY: "<",
        RelationshipType.MANY_TO_MANY: "<>",
    }
    return mapping.get(rel_type, "<")


def export_dbml(database_model: DatabaseModel) -> str:
    """
    Generate a DBML schema file from a DatabaseModel.

    Includes:
      - Table definitions with column types and constraints
      - Relationship references
      - Table-level indexes
    """
    lines: list[str] = [
        "// ============================================================",
        "// Archon Generated DBML Schema",
        "// ============================================================",
        "",
    ]

    for table in database_model.tables:
        if table.description:
            lines.append(f"// {table.description}")
        lines.append(f'Table "{table.name}" {{')
        for col in table.columns:
            lines.append(_dbml_column(col))

        # Indexes block
        idx_for_table = [i for i in database_model.indexes if i.table == table.name]
        if idx_for_table:
            lines.append("")
            lines.append("    indexes {")
            for idx in idx_for_table:
                cols = ", ".join(f'"{c}"' for c in idx.columns)
                idx_name = f'idx_{table.name}_{"_".join(idx.columns)}'
                lines.append(f'        ({cols}) [name: "{idx_name}"]')
            lines.append("    }")

        lines.append("}")
        lines.append("")

    # ── Relationships ─────────────────────────────────────────────────────
    if database_model.relationships:
        lines.append("// ── Relationships ───────────────────────────────────────")
        for rel in database_model.relationships:
            op = _rel_type_dbml(rel.relationship_type)
            # Use first PK-like column as the FK reference (heuristic for V1)
            src_table = rel.source_table
            tgt_table = rel.target_table

            # Try to find a column in source that references target
            src_tbl_obj = next((t for t in database_model.tables if t.name == src_table), None)
            fk_col = "id"
            if src_tbl_obj:
                for col in src_tbl_obj.columns:
                    if tgt_table.lower().rstrip("s") in col.name.lower() and "id" in col.name.lower():
                        fk_col = col.name
                        break

            if rel.description:
                lines.append(f"// {rel.description}")
            lines.append(f'Ref: "{src_table}"."{fk_col}" {op} "{tgt_table}"."id"')
        lines.append("")

    return "\n".join(lines)
