#!/usr/bin/env bun
/**
 * Resolves the Javy CLI path the same way customers do (GitHub release → ~/.cache/javy/...).
 * Prints only the absolute path on stdout so shell scripts can capture it.
 * Diagnostics go to stderr when CRE_SDK_JAVY_LOG_STDERR=1 (set below).
 */
process.env.CRE_SDK_JAVY_LOG_STDERR = '1'

const { ensureJavy } = await import('./ensure-javy.ts')
const version = process.env.CRE_JAVY_VERSION ?? 'v8.1.0'
const bin = await ensureJavy({ version })
process.stdout.write(bin)
