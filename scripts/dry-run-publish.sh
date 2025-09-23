#!/bin/bash
set -e

echo "🧪 CRE SDK Dry-Run Publish Test"
echo "================================"

# Function to restore original state on exit
cleanup() {
    echo ""
    echo "🔄 Cleaning up..."
    
    # Get the current directory to ensure we're in the right place
    SCRIPT_DIR=$(pwd)
    
    # Restore workspace dependency in cre-sdk if backup exists
    if [ -f "$SCRIPT_DIR/packages/cre-sdk/package.json.backup" ]; then
        cd "$SCRIPT_DIR/packages/cre-sdk"
        mv package.json.backup package.json
        echo "✅ Restored cre-sdk workspace dependency"
        cd "$SCRIPT_DIR"
    fi
    
    # Restore original package versions using git
    if [[ "$UPDATE_JAVY" == "true" ]] && [ -d "$SCRIPT_DIR/packages/cre-sdk-javy-plugin" ]; then
        cd "$SCRIPT_DIR/packages/cre-sdk-javy-plugin"
        git checkout -- package.json 2>/dev/null && echo "✅ Restored javy-plugin version" || echo "ℹ️  No javy-plugin version to restore"
        cd "$SCRIPT_DIR"
    fi
    
    cd "$SCRIPT_DIR/packages/cre-sdk"
    git checkout -- package.json 2>/dev/null && echo "✅ Restored cre-sdk version" || echo "ℹ️  No cre-sdk version to restore"
    cd "$SCRIPT_DIR"
    
    echo "🧹 Cleanup completed"
}

# Set trap to run cleanup on script exit (success or failure)
trap cleanup EXIT

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
if [ -z "$1" ]; then
    print_error "SDK version is required"
    echo "Usage: $0 <sdk_version> [javy_version] [update_javy]"
    echo "Example: $0 1.0.0"
    echo "Example: $0 1.0.0 0.9.0"
    echo "Example: $0 1.0.0 1.0.0 false"
    exit 1
fi

SDK_VERSION=$1
JAVY_VERSION=${2:-$SDK_VERSION}
UPDATE_JAVY=${3:-"true"}

print_step "SDK version: $SDK_VERSION"
print_step "Javy plugin version: $JAVY_VERSION"
print_step "Update javy plugin: $UPDATE_JAVY"

print_step "Installing dependencies..."
bun install --frozen-lockfile

# Step 1: Build javy plugin (regardless of version update)
print_step "Building javy-plugin..."
cd packages/cre-sdk-javy-plugin

# Step 2: Update javy-plugin version if requested (before build)
if [[ "$UPDATE_JAVY" == "true" ]]; then
    CURRENT_JAVY_VERSION=$(node -p "require('./package.json').version")
    if [[ "$CURRENT_JAVY_VERSION" != "$JAVY_VERSION" ]]; then
        print_step "Updating javy-plugin from $CURRENT_JAVY_VERSION to $JAVY_VERSION"
        bun pm version $JAVY_VERSION
    else
        print_step "Javy-plugin already at version $JAVY_VERSION, skipping version update"
    fi
fi

# Build javy-plugin
bun run build
print_success "Javy-plugin built successfully"

# Step 3: Dry run javy-plugin publish
if [[ "$UPDATE_JAVY" == "true" ]]; then
    print_step "Running dry-run publish for javy-plugin..."
    bun publish --dry-run --access public --verbose
    print_success "Javy plugin dry-run completed"
fi

cd ../..

# Step 4: Update cre-sdk version and javy-plugin dependency
print_step "Updating cre-sdk package..."
cd packages/cre-sdk

# Update cre-sdk version
CURRENT_SDK_VERSION=$(node -p "require('./package.json').version")
if [[ "$CURRENT_SDK_VERSION" != "$SDK_VERSION" ]]; then
    print_step "Updating cre-sdk from $CURRENT_SDK_VERSION to $SDK_VERSION"
    bun pm version $SDK_VERSION
else
    print_step "CRE SDK already at version $SDK_VERSION, skipping version update"
fi

# Get the javy-plugin version and update cre-sdk dependency
JAVY_VERSION=$(cd ../cre-sdk-javy-plugin && node -p "require('./package.json').version")
print_step "Updating cre-sdk dependency to javy-plugin version $JAVY_VERSION"

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

cd ../..

# Step 5: Run cre-setup
print_step "Setting up CRE environment..."
cd packages/cre-sdk
bun --bun ../cre-sdk-javy-plugin/bin/setup.ts
cd ../..
print_success "CRE setup completed"

# Step 6: Build cre-sdk
print_step "Building cre-sdk..."
cd packages/cre-sdk
bun run build
print_success "CRE SDK built successfully"
cd ../..

# Step 7: Dry run cre-sdk publish
print_step "Running dry-run publish for cre-sdk..."
cd packages/cre-sdk
bun publish --dry-run --access public --verbose
print_success "CRE SDK dry-run completed"
cd ../..

# Step 8: Workspace dependency will be restored by cleanup function

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
echo "  ./scripts/dry-run-publish.sh 1.0.0              # Both packages: 1.0.0"
echo "  ./scripts/dry-run-publish.sh 1.0.0 0.9.0        # SDK: 1.0.0, Javy: 0.9.0"
echo "  ./scripts/dry-run-publish.sh 1.0.0 1.0.0 false  # SDK: 1.0.0, skip javy update"
echo ""
print_step "To actually publish, use the GitHub Actions workflows"
