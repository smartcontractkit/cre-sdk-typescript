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

echo "Running star-wars workflow simulation..."
cre workflow simulate ./src/workflows/star-wars \
  --non-interactive \
  --trigger-index 0 \
  --http-payload ./src/workflows/star-wars/http_trigger_payload.json \
  > "$OUTPUT_FILE" 2>&1
cat "$OUTPUT_FILE"

# --- Validation ---
echo ""
echo "Validating simulation output..."

CHECKS=(
  'Running trigger.*http-trigger|Running trigger http-trigger'
  'Workflow Simulation Result:|Workflow Simulation Result:'
  '"name": "Luke Skywalker"|"name": "Luke Skywalker"'
  '"height": "172"|"height": "172"'
  '"mass": "77"|"mass": "77"'
  '"hair_color": "blond"|"hair_color": "blond"'
  '"skin_color": "fair"|"skin_color": "fair"'
  '"eye_color": "blue"|"eye_color": "blue"'
  '"birth_year": "19BBY"|"birth_year": "19BBY"'
  '"gender": "male"|"gender": "male"'
  '"homeworld": "https://swapi.info/api/planets/1"|"homeworld" URL'
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
