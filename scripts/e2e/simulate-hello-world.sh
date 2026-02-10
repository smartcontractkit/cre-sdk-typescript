#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/packages/cre-sdk-examples"
OUTPUT_FILE="$(mktemp)"

cleanup() { rm -f "$OUTPUT_FILE"; }
trap cleanup EXIT

cd "$EXAMPLES_DIR"
cp -n .env.example .env 2>/dev/null || true

echo "Running hello-world workflow simulation..."
cre workflow simulate ./src/workflows/hello-world > "$OUTPUT_FILE" 2>&1
cat "$OUTPUT_FILE"

# --- Validation ---
echo ""
echo "Validating simulation output..."

CHECKS=(
  'USER LOG.*Hello world! Workflow triggered|[USER LOG] Hello world! Workflow triggered.'
  'Workflow Simulation Result:|Workflow Simulation Result:'
  '"Hello world!"|"Hello world!"'
  'Execution finished signal received|Execution finished signal received'
)

for check in "${CHECKS[@]}"; do
  pattern="${check%%|*}"
  label="${check##*|}"
  if ! grep -q "$pattern" "$OUTPUT_FILE"; then
    echo "❌ ERROR: Expected '$label' not found"
    exit 1
  fi
  echo "✓ Found: $label"
done

echo "✅ All validation checks passed!"
