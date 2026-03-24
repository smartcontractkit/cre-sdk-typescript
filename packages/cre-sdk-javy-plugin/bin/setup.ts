#!/usr/bin/env bun
import { ensureJavy } from '../scripts/ensure-javy.ts'

await ensureJavy({ version: 'v8.1.0' })

console.log('✅ CRE TS SDK is ready to use.')
