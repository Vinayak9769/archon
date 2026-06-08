#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

PROTO_DIR="$ROOT_DIR/proto"
GO_OUT="$ROOT_DIR/gateway/generated/archonpb"
PY_OUT="$ROOT_DIR/ai-service/generated"

echo "=== Archon Proto Compilation ==="

# Ensure output directories exist
mkdir -p "$GO_OUT"
mkdir -p "$PY_OUT"

# ── Go stubs ──────────────────────────────────────────────────────────────────
echo "[1/2] Generating Go stubs → $GO_OUT"
protoc \
  --proto_path="$PROTO_DIR" \
  --go_out="$GO_OUT" \
  --go_opt=paths=source_relative \
  --go-grpc_out="$GO_OUT" \
  --go-grpc_opt=paths=source_relative \
  "$PROTO_DIR/archon.proto"

echo "  ✓ archon.pb.go"
echo "  ✓ archon_grpc.pb.go"

# ── Python stubs ──────────────────────────────────────────────────────────────
echo "[2/2] Generating Python stubs → $PY_OUT"
VENV_PYTHON="$ROOT_DIR/ai-service/.venv/bin/python"
"$VENV_PYTHON" -m grpc_tools.protoc \
  --proto_path="$PROTO_DIR" \
  --python_out="$PY_OUT" \
  --grpc_python_out="$PY_OUT" \
  --pyi_out="$PY_OUT" \
  "$PROTO_DIR/archon.proto"

# Fix relative import in generated gRPC stub
sed -i 's/^import archon_pb2/from . import archon_pb2/' "$PY_OUT/archon_pb2_grpc.py"

# Create __init__.py for the Python package
touch "$PY_OUT/__init__.py"

echo "  ✓ archon_pb2.py"
echo "  ✓ archon_pb2_grpc.py"
echo ""
echo "=== Done ==="
