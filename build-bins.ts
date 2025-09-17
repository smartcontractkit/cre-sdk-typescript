#!/usr/bin/env bun

import { $ } from "bun";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  accessSync,
  openSync,
  closeSync,
  unlinkSync,
  renameSync,
  constants,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

interface PlatformConfig {
  target: string;
  platformArch: string;
  os: string;
  cpu: string;
  javyAsset?: {
    name: string;
    outName: string;
  };
}

const platforms: PlatformConfig[] = [
  {
    target: "bun-darwin-arm64",
    platformArch: "darwin-arm64",
    os: "darwin",
    cpu: "arm64",
    javyAsset: {
      name: "javy-arm-macos",
      outName: "javy",
    },
  },
  {
    target: "bun-darwin-x64",
    platformArch: "darwin-x64",
    os: "darwin",
    cpu: "x64",
    javyAsset: {
      name: "javy-x86_64-macos",
      outName: "javy",
    },
  },
  {
    target: "bun-linux-x64",
    platformArch: "linux-x64",
    os: "linux",
    cpu: "x64",
    javyAsset: {
      name: "javy-x86_64-linux",
      outName: "javy",
    },
  },
  {
    target: "bun-linux-arm64",
    platformArch: "linux-arm64",
    os: "linux",
    cpu: "arm64",
    javyAsset: {
      name: "javy-arm-linux",
      outName: "javy",
    },
  },
  {
    target: "bun-windows-x64",
    platformArch: "windows-x64",
    os: "win32",
    cpu: "x64",
    javyAsset: {
      name: "javy-x86_64-windows",
      outName: "javy.exe",
    },
  },
];

const outputDir = "pkg/cli";
const javyVersion = "v5.0.4";

const exists = (path: string): boolean => {
  try {
    accessSync(path);
    return true;
  } catch {
    return false;
  }
};

const getPackageVersion = (): string => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
  return packageJson.version;
};

const downloadText = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
};

const downloadBinary = async (url: string): Promise<Buffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
};

const verifySha256 = (buffer: Buffer, expectedHex: string): void => {
  const actual = createHash("sha256").update(buffer).digest("hex");
  if (!expectedHex || expectedHex.length < 64 || expectedHex !== actual) {
    throw new Error(`Checksum failed: expected ${expectedHex}, got ${actual}`);
  }
};

const writeFileAtomic = (dest: string, data: Buffer, mode: number): void => {
  const tmp = `${dest}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, data, { mode });
  renameSync(tmp, dest);
};

const downloadJavy = async (
  javyAsset: { name: string; outName: string },
  outputPath: string
): Promise<void> => {
  if (exists(outputPath)) {
    console.log(`  ✓ Javy binary already exists at ${outputPath}`);
    return;
  }

  const baseUrl = "https://github.com/bytecodealliance/javy/releases/download";
  const fullName = `${javyAsset.name}-${javyVersion}`;
  const gzUrl = `${baseUrl}/${javyVersion}/${fullName}.gz`;
  const shaUrl = `${baseUrl}/${javyVersion}/${fullName}.gz.sha256`;

  console.log(`  Downloading Javy binary for ${javyAsset.name}...`);

  try {
    const [shaText, gzBuffer] = await Promise.all([
      downloadText(shaUrl),
      downloadBinary(gzUrl),
    ]);

    const expectedSha = shaText.trim().split(/\s+/)[0];
    verifySha256(gzBuffer, expectedSha);

    const binaryBuffer = gunzipSync(gzBuffer);
    writeFileAtomic(outputPath, binaryBuffer, 0o755);

    console.log(`  ✓ Downloaded and verified Javy binary`);
  } catch (error) {
    console.error(`  ✗ Failed to download Javy binary:`, error);
    throw error;
  }
};

const createPlatformPackageJson = (
  platformArch: string,
  version: string,
  os: string,
  cpu: string
): void => {
  const packageJson = {
    name: `@chainlink/cre-ts-${platformArch}`,
    version,
    os: [os],
    cpu: [cpu],
  };

  const packageJsonPath = join(outputDir, platformArch, "package.json");
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
};

const buildPlatform = async (
  config: PlatformConfig,
  version: string
): Promise<void> => {
  const { target, platformArch, os, cpu, javyAsset } = config;

  console.log(`Building for ${platformArch}...`);

  // Ensure output directory exists
  const platformDir = join(outputDir, platformArch, "bin");
  mkdirSync(platformDir, { recursive: true });

  const outputFile = join(outputDir, platformArch, "bin", "cre-build");

  // Build the binary
  await $`bun build ./cli/run.ts --target=${target} --compile --outfile ${outputFile}`;

  // Make executable (skip for Windows as it generates .exe)
  if (os !== "win32") {
    chmodSync(outputFile, 0o755);
  }

  // Download Javy binary if available for this platform
  if (javyAsset) {
    const javyFileName = `${javyAsset.name}-${javyVersion}`;
    const javyPath = join(platformDir, javyFileName);
    await downloadJavy(javyAsset, javyPath);
  } else {
    console.log(`  ⚠ No Javy binary available for ${platformArch}`);
  }

  // Create platform-specific package.json
  createPlatformPackageJson(platformArch, version, os, cpu);

  console.log(`✓ Built ${platformArch} binary`);
};

const getTargetPlatforms = (): PlatformConfig[] => {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const targetPlatform = args[0];

  if (!targetPlatform) {
    // No platform specified, build all platforms
    console.log("No target platform specified, building all platforms...");
    return platforms;
  }

  // Find the platform that matches the target
  const matchedPlatforms = platforms.filter(
    (platform) => platform.platformArch === targetPlatform
  );

  if (matchedPlatforms.length === 0) {
    console.error(`Error: Unknown platform "${targetPlatform}"`);
    console.error("Available platforms:");
    platforms.forEach((platform) => {
      console.error(`  - ${platform.platformArch}`);
    });
    process.exit(1);
  }

  console.log(`Building for target platform: ${targetPlatform}`);
  return matchedPlatforms;
};

const main = async (): Promise<void> => {
  try {
    const version = getPackageVersion();
    const targetPlatforms = getTargetPlatforms();
    
    console.log(`Building binaries for version ${version}...`);

    // Build target platforms in parallel for better performance
    await Promise.all(
      targetPlatforms.map((platform) => buildPlatform(platform, version))
    );

    console.log("Platform binaries built successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (import.meta.main) {
  await main();
}
