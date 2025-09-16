sh build-pkg.sh

bun pm pack --destination ./dist
# tar -cvzf backup.tgz ./dist

# Pack each platform-specific folder in dist/bin
for folder in dist/bin/*/; do
  if [ -d "$folder" ] && [ -f "$folder/package.json" ]; then
    echo "Packing $folder..."
    (cd "$folder" && bun pm pack --destination ../..)
  fi
done
