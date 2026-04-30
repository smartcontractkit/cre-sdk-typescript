#!/bin/bash
# test-templates.sh
# Builds the local SDK, packs it into a tarball, and runs it against all
# TypeScript templates in the cre-templates repository.
# The cre-templates directory is fully restored on exit, even if the script crashes.
#
# Usage:
#   bun run test:templates [--verbose|-v]
#
# Environment variables:
#   TEMPLATES_DIR   Path to the cre-templates repo (default: ../cre-templates)
#   VERBOSE         Set to 1 to enable verbose output (same as --verbose)

# --------------------------------------------------------------------------
# Flags

VERBOSE=false
for arg in "$@"; do
  case "$arg" in
    -v|--verbose) VERBOSE=true ;;
  esac
done
[ "${VERBOSE:-0}" = "1" ] && VERBOSE=true

# --------------------------------------------------------------------------
# Logging helpers

# Always printed
info()  { echo "$@"; }
# Only printed in verbose mode
vlog()  { $VERBOSE && echo "$@" || true; }

# Run a command, streaming output in verbose mode or capturing it silently.
# Usage: run_captured <output_var> <cmd> [args...]
# Sets $output_var to the combined stdout+stderr of the command.
# Returns the command's exit code.
run_captured() {
  local _outvar="$1"; shift
  local _tmpfile; _tmpfile=$(mktemp)
  if $VERBOSE; then
    "$@" 2>&1 | tee "$_tmpfile"; local _rc="${PIPESTATUS[0]}"
  else
    "$@" > "$_tmpfile" 2>&1; local _rc=$?
  fi
  # shellcheck disable=SC2086
  printf -v "$_outvar" '%s' "$(cat "$_tmpfile")"
  rm -f "$_tmpfile"
  return "$_rc"
}

# --------------------------------------------------------------------------
# Cleanup tracking

LOCKFILE_BACKUPS=()  # "backup_path:original_path" pairs
GENERATED_FILES=()   # files to delete on exit
SDK_TARBALLS=()      # tarball files to delete on exit
TEMP_FILES=()        # misc temp files

MONOREPO_ROOT=""     # set after cd below

cleanup() {
  info ""
  info "Cleaning up..."

  local sdk_pkg_bak="$MONOREPO_ROOT/packages/cre-sdk/package.json.bak"
  if [ -f "$sdk_pkg_bak" ]; then
    mv "$sdk_pkg_bak" "$MONOREPO_ROOT/packages/cre-sdk/package.json"
    vlog "  Restored: packages/cre-sdk/package.json"
  fi

  for entry in "${LOCKFILE_BACKUPS[@]+"${LOCKFILE_BACKUPS[@]}"}"; do
    local backup="${entry%%:*}"
    local original="${entry##*:}"
    if [ -f "$backup" ]; then
      mv "$backup" "$original"
      vlog "  Restored: $original"
    fi
  done

  for f in "${GENERATED_FILES[@]+"${GENERATED_FILES[@]}"}"; do
    if [ -f "$f" ]; then
      rm "$f"
      vlog "  Removed:  $f"
    fi
  done

  for f in "${SDK_TARBALLS[@]+"${SDK_TARBALLS[@]}"}"; do
    if [ -f "$f" ]; then
      rm "$f"
      vlog "  Removed:  $f"
    fi
  done

  for f in "${TEMP_FILES[@]+"${TEMP_FILES[@]}"}"; do
    rm -f "$f"
  done
}

trap cleanup EXIT INT TERM

# --------------------------------------------------------------------------
# Setup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$MONOREPO_ROOT"

TEMPLATES_DIR="${TEMPLATES_DIR:-../cre-templates}"

# --------------------------------------------------------------------------
# 1. Build

info "Building SDK..."

# Back up the compiled wasm artifact before the build overwrites it.
# Using a file backup (not git restore) so we restore whatever state the
# developer had — including uncommitted changes — not just the last commit.
# IMPORTANT: the backup must live outside the dist/ directory because the
# build's clean step runs `rm -rf dist`, which would delete an in-place backup.
WASM_FILE="$MONOREPO_ROOT/packages/cre-sdk-javy-plugin/dist/javy-chainlink-sdk.plugin.wasm"
if [ -f "$WASM_FILE" ]; then
  WASM_BACKUP=$(mktemp)
  cp "$WASM_FILE" "$WASM_BACKUP"
  LOCKFILE_BACKUPS+=("$WASM_BACKUP:$WASM_FILE")
fi

_build_out=""
if ! run_captured _build_out bun run build; then
  info "❌ SDK build failed."
  info ""
  info "$_build_out"
  exit 1
fi
info "✅ SDK built."
info ""

# --------------------------------------------------------------------------
# 2. Pack

info "Packing SDK..."

cd packages/cre-sdk-javy-plugin
JAVY_TARBALL=$(npm pack --quiet 2>/dev/null)
if [ -z "$JAVY_TARBALL" ]; then
  info "❌ Failed to pack Javy plugin."
  exit 1
fi
JAVY_TARBALL_PATH="$(pwd)/$JAVY_TARBALL"
SDK_TARBALLS+=("$JAVY_TARBALL_PATH")
vlog "  Javy plugin: $JAVY_TARBALL_PATH"

cd ../cre-sdk
cp package.json package.json.bak
npm pkg set dependencies."@chainlink/cre-sdk-javy-plugin"="file:$JAVY_TARBALL_PATH"

TARBALL=$(npm pack --quiet 2>/dev/null)
if [ -z "$TARBALL" ]; then
  info "❌ Failed to pack SDK."
  exit 1
fi
TARBALL_PATH="$(pwd)/$TARBALL"
SDK_TARBALLS+=("$TARBALL_PATH")
vlog "  SDK:         $TARBALL_PATH"

mv package.json.bak package.json
cd "$MONOREPO_ROOT"

info "✅ SDK packed."
info ""

# --------------------------------------------------------------------------
# 3. Discover templates

if [ ! -d "$TEMPLATES_DIR" ]; then
  info "❌ Templates directory not found: $TEMPLATES_DIR"
  info "Override with: TEMPLATES_DIR=/path/to/cre-templates ./scripts/test-templates.sh"
  exit 1
fi

TEMPLATES_ABS_PATH="$(cd "$TEMPLATES_DIR" && pwd)"

# Collect all package.json files that depend on @chainlink/cre-sdk
ALL_PKGS=()
while IFS= read -r pkg; do
  grep -q '"@chainlink/cre-sdk"' "$pkg" && ALL_PKGS+=("$pkg")
done < <(/usr/bin/find "$TEMPLATES_ABS_PATH" -name "package.json" -not -path "*/node_modules/*")

TOTAL=${#ALL_PKGS[@]}
info "Found $TOTAL TypeScript templates to test."
info ""

# --------------------------------------------------------------------------
# 4. Test each template

FAILED_TEMPLATES=()
PASSED_TEMPLATES=()
# Parallel arrays: failure reason and captured output for each failed template
FAILURE_STEPS=()
FAILURE_OUTPUTS=()

IDX=0
for pkg in "${ALL_PKGS[@]}"; do
  IDX=$((IDX + 1))
  WORKFLOW_DIR=$(dirname "$pkg")
  WORKFLOW_DIR_NAME=$(basename "$WORKFLOW_DIR")
  PROJECT_NAME=$(basename "$(dirname "$WORKFLOW_DIR")")
  DISPLAY_NAME="$PROJECT_NAME/$WORKFLOW_DIR_NAME"
  PREFIX="[$IDX/$TOTAL]"

  vlog "--------------------------------------------------------"
  vlog "$PREFIX $DISPLAY_NAME"
  vlog "--------------------------------------------------------"

  cd "$WORKFLOW_DIR"

  # Track lock files for restoration
  for lockfile in package-lock.json bun.lock; do
    if [ -f "$lockfile" ]; then
      cp "$lockfile" "$lockfile.bak"
      LOCKFILE_BACKUPS+=("$WORKFLOW_DIR/$lockfile.bak:$WORKFLOW_DIR/$lockfile")
    else
      GENERATED_FILES+=("$WORKFLOW_DIR/$lockfile")
    fi
  done

  # Install dependencies
  vlog "  Installing dependencies..."
  _out=""
  if ! run_captured _out npm install --no-audit --fund=false; then
    info "  ❌ $PREFIX $DISPLAY_NAME"
    FAILED_TEMPLATES+=("$DISPLAY_NAME")
    FAILURE_STEPS+=("npm install")
    FAILURE_OUTPUTS+=("$_out")
    continue
  fi

  # Inject local SDK tarball
  vlog "  Installing local SDK..."
  if ! run_captured _out npm install --no-save --no-audit --fund=false "$TARBALL_PATH"; then
    info "  ❌ $PREFIX $DISPLAY_NAME"
    FAILED_TEMPLATES+=("$DISPLAY_NAME")
    FAILURE_STEPS+=("sdk install")
    FAILURE_OUTPUTS+=("$_out")
    continue
  fi

  FAILED_THIS=false

  # Typecheck
  if grep -q '"typecheck"' package.json; then
    vlog "  Running typecheck..."
    if ! run_captured _out npm run typecheck --silent; then
      info "  ❌ $PREFIX $DISPLAY_NAME"
      FAILED_TEMPLATES+=("$DISPLAY_NAME")
      FAILURE_STEPS+=("typecheck")
      FAILURE_OUTPUTS+=("$_out")
      FAILED_THIS=true
    else
      vlog "  ✅ typecheck passed"
    fi
  else
    vlog "  ⚠️  No typecheck script, skipping"
  fi

  if $FAILED_THIS; then continue; fi

  # Compile to WASM
  if [ -f "main.ts" ]; then
    GENERATED_FILES+=("$WORKFLOW_DIR/main.js" "$WORKFLOW_DIR/main.wasm")
    vlog "  Running cre-compile..."
    if ! run_captured _out npx --no cre-compile main.ts; then
      info "  ❌ $PREFIX $DISPLAY_NAME"
      FAILED_TEMPLATES+=("$DISPLAY_NAME")
      FAILURE_STEPS+=("cre-compile")
      FAILURE_OUTPUTS+=("$_out")
      continue
    fi
    vlog "  ✅ compile passed"
    info "  ✅ $PREFIX $DISPLAY_NAME"
    PASSED_TEMPLATES+=("$DISPLAY_NAME")
  else
    vlog "  ⚠️  No main.ts, skipping compile"
    info "  ✅ $PREFIX $DISPLAY_NAME (typecheck only)"
    PASSED_TEMPLATES+=("$DISPLAY_NAME (typecheck only)")
  fi
done

# --------------------------------------------------------------------------
# 5. Summary

PASS_COUNT=${#PASSED_TEMPLATES[@]}
FAIL_COUNT=${#FAILED_TEMPLATES[@]}

info ""
info "========================================================"
info "Results: $PASS_COUNT passed, $FAIL_COUNT failed"
info "========================================================"

if [ $FAIL_COUNT -gt 0 ]; then
  info ""
  info "Failed templates:"
  for t in "${FAILED_TEMPLATES[@]}"; do
    info "  ❌ $t"
  done

  info ""
  info "========================================================"
  info "Failure Details"
  info "========================================================"

  for i in "${!FAILED_TEMPLATES[@]}"; do
    info ""
    info "❌ ${FAILED_TEMPLATES[$i]} — ${FAILURE_STEPS[$i]}"
    info "--------"
    # Print the captured output, stripping npm warn noise to highlight real errors
    echo "${FAILURE_OUTPUTS[$i]}" | grep -v "^npm warn" | grep -v "^$" || true
  done

  exit 1
else
  info ""
  info "All templates passed!"
  exit 0
fi
