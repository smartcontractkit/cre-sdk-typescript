#!/bin/bash

# Check if target directory is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <target_directory>"
    echo "Example: $0 /path/to/your/project"
    exit 1
fi

TARGET_DIR="$1"

# Validate target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Target directory '$TARGET_DIR' does not exist."
    exit 1
fi

sh build-pkg.sh

sh build-bins.sh


# Convert to absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo "Installing CRE SDK to: $TARGET_DIR"

rm -rf "$TARGET_DIR/node_modules/@chainlink"

mkdir -p "$TARGET_DIR/node_modules/@chainlink/cre-sdk"

# Move the dist folder from local development to node_modules
mv ./dist/bin/darwin-arm64 "$TARGET_DIR/node_modules/@chainlink/cre-ts-darwin-arm64"
mv ./dist/* "$TARGET_DIR/node_modules/@chainlink/cre-sdk/"

# Create symlinks from cre-sdk/bin to node_modules/.bin
mkdir -p "$TARGET_DIR/node_modules/.bin"

CRE_SDK_BIN="$TARGET_DIR/node_modules/@chainlink/cre-sdk/bin"

# Create symlinks for each executable in the cre-sdk bin folder
for executable in "$CRE_SDK_BIN"/*; do
    if [ -f "$executable" ] && [ -x "$executable" ]; then
        executable_name=$(basename "$executable")
        ln -sf "$executable" "$TARGET_DIR/node_modules/.bin/$executable_name"
        echo "Created symlink: .bin/$executable_name -> @chainlink/cre-sdk/bin/$executable_name"
    fi
done

echo "Dependencies updated and symlinks created successfully in $TARGET_DIR!"