sh build-pkg.sh

bun pm pack --destination ./pkg
# tar -cvzf backup.tgz ./dist

# Pack each platform-specific folder in dist/bin
for folder in pkg/cli/*/; do
  if [ -d "$folder" ] && [ -f "$folder/package.json" ]; then
    echo "Packing $folder..."
    (cd "$folder" && bun pm pack --destination ../../../pkg)
  fi
done
