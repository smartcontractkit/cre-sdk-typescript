
#!/bin/bash

# Platform configurations: "bun-target:platform-arch:os:cpu"
platforms=(
  "bun-darwin-arm64:darwin-arm64:darwin:arm64"
  "bun-darwin-x64:darwin-x64:darwin:x64"
  "bun-linux-x64:linux-x64:linux:x64"
  "bun-linux-arm64:linux-arm64:linux:arm64"
  "bun-windows-x64:windows-x64:win32:x64"
)

# Loop through each platform configuration
for platform_config in "${platforms[@]}"; do
  # Split the configuration string
  IFS=':' read -r bun_target platform_arch os cpu <<< "$platform_config"
  
  echo "Building for $platform_arch..."
  
  # Build the binary
  bun build ./cli/run.ts --target="$bun_target" --compile --outfile "dist/bin/$platform_arch/bin/cre-build"

  chmod +x "dist/bin/$platform_arch/bin/cre-build"
  
  # Create package.json for this platform
  cat > "dist/bin/$platform_arch/package.json" << EOF
{
  "name": "@chainlink/cre-build-$platform_arch",
  "version": "1.0.0",
  "os": ["$os"],
  "cpu": ["$cpu"]
}
EOF

  echo "✓ Built $platform_arch binary"
done

echo "All platform binaries built successfully!"