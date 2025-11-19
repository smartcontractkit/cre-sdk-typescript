#!/bin/zsh

# Exit on any error
set -e

echo "🚀 Running full checks for CRE SDK TypeScript packages..."

# Function to run command in a package directory
run_in_package() {
  local package_dir=$1
  local command=$2
  
  echo "📦 Running '$command' in $package_dir..."
  cd "packages/$package_dir"
  bun run "$command"
  cd ../..
}

# cre-sdk-javy-plugin package
run_in_package "cre-sdk-javy-plugin" "build"
run_in_package "cre-sdk-javy-plugin" "typecheck"
run_in_package "cre-sdk-javy-plugin" "check"

# cre-sdk package
run_in_package "cre-sdk" "clean" # Ensure clean build first
run_in_package "cre-sdk" "compile:cre-setup"
run_in_package "cre-sdk" "generate:sdk" # Generate first to ensure types and sources are available
run_in_package "cre-sdk" "build"
run_in_package "cre-sdk" "typecheck"
run_in_package "cre-sdk" "check"
run_in_package "cre-sdk" "test"
run_in_package "cre-sdk" "test:standard"

# cre-sdk-examples package
run_in_package "cre-sdk-examples" "check"
run_in_package "cre-sdk-examples" "typecheck"

echo "✅ All checks completed successfully!"
