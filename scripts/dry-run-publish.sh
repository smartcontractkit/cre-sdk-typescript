#!/bin/bash
set -e

echo "🧪 CRE SDK Dry-Run Publish Test"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "packages" ]]; then
    print_error "Please run this script from the cre-sdk-typescript root directory"
    exit 1
fi

# Parse command line arguments
SDK_VERSION=${1:-"0.0.2-test"}
JAVY_VERSION=${2:-$SDK_VERSION}
UPDATE_JAVY=${3:-"true"}

print_step "SDK version: $SDK_VERSION"
print_step "Javy plugin version: $JAVY_VERSION"
print_step "Update javy plugin: $UPDATE_JAVY"

print_step "Installing dependencies..."
bun install --frozen-lockfile

print_step "Updating package versions..."

# Update javy-plugin version (if requested)
if [[ "$UPDATE_JAVY" == "true" ]]; then
    cd packages/cre-sdk-javy-plugin
    print_step "Updating javy-plugin to $JAVY_VERSION"
    bun pm version $JAVY_VERSION
    cd ../..
else
    print_step "Skipping javy-plugin version update"
fi

# Update cre-sdk version
cd packages/cre-sdk
print_step "Updating cre-sdk to $SDK_VERSION"
bun pm version $SDK_VERSION
cd ../..

print_step "Building javy plugin..."
cd packages/cre-sdk-javy-plugin
bun run build
cd ../..

print_step "Building cre-sdk with turbo..."
bun run build

print_step "Resolving workspace dependencies for publishing..."

# Get the current version from javy-plugin
JAVY_VERSION=$(cd packages/cre-sdk-javy-plugin && node -p "require('./package.json').version")
echo "Javy plugin version: $JAVY_VERSION"

# Update cre-sdk package.json to use the actual version instead of workspace:*
cd packages/cre-sdk

# Create a backup of the original package.json
cp package.json package.json.backup

# Replace workspace:* with the actual version
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' "s/\"@chainlink\/cre-sdk-javy-plugin\": \"workspace:\*\"/\"@chainlink\/cre-sdk-javy-plugin\": \"^$JAVY_VERSION\"/" package.json
else
    # Linux sed
    sed -i "s/\"@chainlink\/cre-sdk-javy-plugin\": \"workspace:\*\"/\"@chainlink\/cre-sdk-javy-plugin\": \"^$JAVY_VERSION\"/" package.json
fi

print_success "Updated cre-sdk dependency to use version ^$JAVY_VERSION"
echo "Dependency line:"
cat package.json | grep "@chainlink/cre-sdk-javy-plugin"

cd ../..

if [[ "$UPDATE_JAVY" == "true" ]]; then
    print_step "Running dry-run publish for javy-plugin..."
    cd packages/cre-sdk-javy-plugin
    bun publish --dry-run --access public --verbose
    print_success "Javy plugin dry-run completed"
    cd ../..
else
    print_step "Skipping javy-plugin publish (not updated)"
fi

print_step "Running dry-run publish for cre-sdk..."
cd packages/cre-sdk
bun publish --dry-run --access public --verbose
print_success "CRE SDK dry-run completed"

print_step "Restoring original package.json..."
if [ -f package.json.backup ]; then
    mv package.json.backup package.json
    print_success "Restored original package.json with workspace:* dependency"
fi

cd ../..

print_success "🎉 Dry-run publish test completed successfully!"
echo ""
echo "Summary:"
if [[ "$UPDATE_JAVY" == "true" ]]; then
    echo "- ✅ Javy plugin ($JAVY_VERSION) builds and can be published"
fi
echo "- ✅ CRE SDK ($SDK_VERSION) builds with proper dependency resolution"
echo "- ✅ Workspace dependencies correctly resolved for publishing"
echo "- ✅ Original package.json restored"
echo ""
echo "Usage examples:"
echo "  ./scripts/dry-run-publish.sh                    # Both packages: 0.0.2-test"
echo "  ./scripts/dry-run-publish.sh 1.0.0              # Both packages: 1.0.0"
echo "  ./scripts/dry-run-publish.sh 1.0.0 0.9.0        # SDK: 1.0.0, Javy: 0.9.0"
echo "  ./scripts/dry-run-publish.sh 1.0.0 1.0.0 false  # SDK: 1.0.0, skip javy update"
echo ""
print_step "To actually publish, use the GitHub Actions workflows"
