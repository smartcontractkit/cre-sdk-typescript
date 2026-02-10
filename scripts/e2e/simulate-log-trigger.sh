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

echo "Running log-trigger workflow simulation..."
SIM_EXIT=0
cre workflow simulate ./src/workflows/log-trigger \
  --non-interactive \
  --trigger-index 0 \
  --evm-tx-hash 0x9394cc015736e536da215c31e4f59486a8d85f4cfc3641e309bf00c34b2bf410 \
  --evm-event-index 0 \
  > "$OUTPUT_FILE" 2>&1 || SIM_EXIT=$?
cat "$OUTPUT_FILE"

if [ "$SIM_EXIT" -ne 0 ]; then
  echo "❌ ERROR: cre workflow simulate exited with code $SIM_EXIT"
  exit "$SIM_EXIT"
fi

# --- Validation ---
echo ""
echo "Validating simulation output..."

CHECKS=(
  'Running trigger.*evm|Running trigger evm'
  'USER LOG.*Running LogTrigger|[USER LOG] Running LogTrigger'
  'USER LOG.*Contract address: 0x1d598672486ecb50685da5497390571ac4e93fdc|[USER LOG] Contract address'
  'USER LOG.*Topics: 0xc799f359194674b273986b8c03283265390f642b631c04e6526b99d0d8f4c38d|[USER LOG] Topics'
  'USER LOG.*Tx hash: 0x9394cc015736e536da215c31e4f59486a8d85f4cfc3641e309bf00c34b2bf410|[USER LOG] Tx hash'
  'USER LOG.*Block number: 9559751|[USER LOG] Block number: 9559751'
  'USER LOG.*Block timestamp:|[USER LOG] Block timestamp'
  'Workflow Simulation Result:|Workflow Simulation Result:'
  '"success"|"success"'
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
