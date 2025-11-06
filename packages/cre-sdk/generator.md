# TypeScript Generator - Generic Label Support Implementation Plan

## Problem Statement

The TypeScript SDK generator is **hardcoded** to only handle `ChainSelector` labels, while the Go SDK generator handles **any label type** generically. This prevents adding new capabilities with different label types (e.g., KV store with `StoreName`, database with `DatabaseId`, etc.).

## Current State Analysis

### Hardcoded ChainSelector Logic

**Location:** `src/generator/generate-sdk.ts`

```typescript
// Lines 122-124: Hardcoded check for ChainSelector
const chainSelectorLabel = capOption.labels?.ChainSelector as any
const hasChainSelector = chainSelectorLabel?.kind?.case === 'uint64Label'

// Lines 227-244: Only processes ChainSelector
if (hasChainSelector && capOption.labels) {
    const chainSelectorLabel = capOption.labels.ChainSelector as any
    // ... only generates ChainSelector support
}
```

**Propagation:**
- `generate-action.ts`: Receives `hasChainSelector` boolean
- `generate-trigger.ts`: Receives `hasChainSelector` boolean
- Both use it to conditionally add ChainSelector to capability ID

### Go's Generic Approach (Reference)

**Location:** `chainlink-common/pkg/capabilities/v2/protoc/pkg/template_generator.go`

```go
// Lines 212-222: Generic Labels function
"Labels": func(s *protogen.Service) ([]Label, error) {
    md, err := getCapabilityMetadata(s)
    if err != nil {
        return nil, err
    }
    if len(md.Labels) == 0 {
        return nil, nil
    }
    return t.PbLabelTLangLabels(md.Labels)  // Converts ALL labels
}

// Lines 177-211: FullCapabilityId iterates ALL labels
for _, lbl := range orderedLabels {
    lblValStr, err := t.StringLblValue(lbl.name, lbl.label)
    fullName = fmt.Sprintf(`%s + ":%s:" + %s`, fullName, lbl.name, lblValStr)
}
```

**Key Insight:** Go iterates over `md.Labels` (a map) and processes each label regardless of name.

## Proto Definition Structure

```proto
service Client {
  option (tools.generator.v1alpha.capability) = {
    capability_id: "evm@1.0.0"
    labels: {
      key: "ChainSelector"           // Label name
      value: {                        // Label definition
        uint64_label: {               // Label type
          defaults: [                 // Default values (optional)
            { key: "ethereum-mainnet", value: 5009297550715157269 }
          ]
        }
      }
    }
  };
}
```

**Label Types (from `cre_metadata.proto`):**
- `string_label` → `string`
- `uint64_label` → `bigint`
- `uint32_label` → `number`
- `int64_label` → `bigint`
- `int32_label` → `number`

## Implementation Plan

### Phase 1: Create Label Utilities

**New File:** `src/generator/label-utils.ts`

```typescript
import type { CapabilityMetadata } from '@cre/generated/tools/generator/v1alpha/cre_metadata_pb'

/**
 * Represents a processed label with TypeScript-specific information
 */
export interface ProcessedLabel {
    name: string                    // e.g., "ChainSelector"
    type: 'string' | 'bigint' | 'number'
    tsType: string                  // TypeScript type string
    defaults?: Record<string, string | number | bigint>
    formatExpression: string        // How to convert to string for capability ID
}

/**
 * Extracts and processes all labels from capability metadata
 */
export function processLabels(capOption: CapabilityMetadata): ProcessedLabel[] {
    if (!capOption.labels || Object.keys(capOption.labels).length === 0) {
        return []
    }

    const labels: ProcessedLabel[] = []
    
    // Sort labels alphabetically for consistency (like Go does)
    const sortedLabelNames = Object.keys(capOption.labels).sort()
    
    for (const labelName of sortedLabelNames) {
        const label = capOption.labels[labelName] as any
        
        if (!label?.kind) continue
        
        const processed = processLabel(labelName, label)
        if (processed) {
            labels.push(processed)
        }
    }
    
    return labels
}

/**
 * Process a single label based on its type
 */
function processLabel(name: string, label: any): ProcessedLabel | null {
    const kindCase = label.kind.case
    const kindValue = label.kind.value
    
    switch (kindCase) {
        case 'stringLabel':
            return {
                name,
                type: 'string',
                tsType: 'string',
                defaults: kindValue?.defaults || undefined,
                formatExpression: `this.${name}`,
            }
        
        case 'uint64Label':
            return {
                name,
                type: 'bigint',
                tsType: 'bigint',
                defaults: kindValue?.defaults || undefined,
                formatExpression: `\${this.${name}}`,
            }
        
        case 'uint32Label':
            return {
                name,
                type: 'number',
                tsType: 'number',
                defaults: kindValue?.defaults || undefined,
                formatExpression: `\${this.${name}}`,
            }
        
        case 'int64Label':
            return {
                name,
                type: 'bigint',
                tsType: 'bigint',
                defaults: kindValue?.defaults || undefined,
                formatExpression: `\${this.${name}}`,
            }
        
        case 'int32Label':
            return {
                name,
                type: 'number',
                tsType: 'number',
                defaults: kindValue?.defaults || undefined,
                formatExpression: `\${this.${name}}`,
            }
        
        default:
            console.warn(`Unsupported label type: ${kindCase} for label: ${name}`)
            return null
    }
}

/**
 * Generate capability ID logic that includes all labels
 */
export function generateCapabilityIdLogic(
    labels: ProcessedLabel[],
    capabilityClassName: string,
): string {
    if (labels.length === 0) {
        return `
    const capabilityId = ${capabilityClassName}.CAPABILITY_ID;`
    }
    
    // Build the capability ID with all labels
    // Format: "name:Label1Name:label1Value:Label2Name:label2Value@version"
    const labelParts = labels.map(label => 
        `:${label.name}:\${${label.formatExpression}}`
    ).join('')
    
    return `
    // Include all labels in capability ID for routing when specified
    const capabilityId = \`\${${capabilityClassName}.CAPABILITY_NAME}${labelParts}@\${${capabilityClassName}.CAPABILITY_VERSION}\`;`
}

/**
 * Generate constructor parameters for all labels
 */
export function generateConstructorParams(labels: ProcessedLabel[]): string[] {
    return labels.map(label => 
        `private readonly ${label.name}: ${label.tsType}`
    )
}

/**
 * Generate constants and helper functions for label defaults
 */
export function generateLabelSupport(labels: ProcessedLabel[]): string {
    if (labels.length === 0) return ''
    
    const sections: string[] = []
    
    for (const label of labels) {
        if (!label.defaults || Object.keys(label.defaults).length === 0) {
            continue
        }
        
        // Generate SUPPORTED_* constants object
        const constantsName = `SUPPORTED_${toScreamingSnakeCase(label.name)}S`
        const entries = Object.entries(label.defaults)
            .map(([key, value]) => {
                const formattedValue = label.type === 'bigint' ? `${value}n` : 
                                      label.type === 'string' ? `"${value}"` : 
                                      value
                return `    "${key}": ${formattedValue}`
            })
            .join(',\n')
        
        sections.push(`
  /** Available ${label.name} values */
  static readonly ${constantsName} = {
${entries}
  } as const`)
    }
    
    return sections.join('\n')
}

/**
 * Convert camelCase to SCREAMING_SNAKE_CASE
 */
function toScreamingSnakeCase(str: string): string {
    return str
        .replace(/([A-Z])/g, '_$1')
        .replace(/^_/, '')
        .toUpperCase()
}
```

### Phase 2: Refactor `generate-sdk.ts`

**Changes to make:**

1. **Import label utilities** (top of file)
```typescript
import { processLabels, generateCapabilityIdLogic, generateConstructorParams, generateLabelSupport } from './label-utils'
```

2. **Replace hardcoded ChainSelector logic** (lines 122-124)
```typescript
// OLD - DELETE:
const chainSelectorLabel = capOption.labels?.ChainSelector as any
const hasChainSelector = chainSelectorLabel?.kind?.case === 'uint64Label'

// NEW:
const labels = processLabels(capOption)
```

3. **Pass labels to method generators** (lines 195-211)
```typescript
// Update generateTriggerMethod call
return generateTriggerMethod(
    method,
    methodName,
    capabilityClassName,
    service.name,
    labels,  // Pass labels array instead of boolean
)

// Update generateActionMethod call
return generateActionMethod(
    method,
    methodName,
    capabilityClassName,
    labels,  // Pass labels array instead of boolean
    modePrefix,
)
```

4. **Replace label support generation** (lines 223-252)
```typescript
// OLD - DELETE lines 223-252

// NEW:
const labelSupport = generateLabelSupport(labels)
const constructorParams = generateConstructorParams(labels)

const constructorCode =
    constructorParams.length > 0
        ? `
	constructor(
    	${constructorParams.join(',\n    ')}
  	) {}`
        : ``
```

5. **Update template output** (line 275)
```typescript
${labelSupport}  // Instead of chainSelectorSupport
```

### Phase 3: Refactor `generate-action.ts`

**Changes:**

1. **Update function signature** (line 13-19)
```typescript
// OLD:
export function generateActionMethod(
    method: DescMethod,
    methodName: string,
    capabilityClassName: string,
    hasChainSelector: boolean = false,  // DELETE
    modePrefix: string,
): string

// NEW:
export function generateActionMethod(
    method: DescMethod,
    methodName: string,
    capabilityClassName: string,
    labels: ProcessedLabel[],  // ADD
    modePrefix: string,
): string
```

2. **Import and use label utilities** (lines 1-2, 20-27)
```typescript
import type { DescMethod } from '@bufbuild/protobuf'
import { generateCapabilityIdLogic, type ProcessedLabel } from './label-utils'
import { wrapType } from './utils'

export function generateActionMethod(...) {
    const capabilityIdLogic = generateCapabilityIdLogic(labels, capabilityClassName)
    
    // Rest of function...
}
```

3. **Remove old hardcoded logic** (delete lines 20-27)

### Phase 4: Refactor `generate-trigger.ts`

**Changes:**

1. **Update function signature** (lines 14-20)
```typescript
// OLD:
export function generateTriggerMethod(
    method: DescMethod,
    methodName: string,
    capabilityClassName: string,
    className: string,
    hasChainSelector: boolean,  // DELETE
): string

// NEW:
export function generateTriggerMethod(
    method: DescMethod,
    methodName: string,
    capabilityClassName: string,
    className: string,
    labels: ProcessedLabel[],  // ADD
): string
```

2. **Import and use label utilities** (lines 1-2, 21-29)
```typescript
import type { DescMethod } from '@bufbuild/protobuf'
import { generateCapabilityIdLogic, type ProcessedLabel } from './label-utils'

export function generateTriggerMethod(...) {
    const triggerClassName = `${className}${method.name}`
    const capabilityIdLogic = generateCapabilityIdLogic(labels, capabilityClassName)
    
    // Rest of function...
}
```

3. **Remove old hardcoded logic** (delete lines 22-29)

### Phase 5: Update Trigger Class Generation

**In `generate-trigger.ts`, update `generateTriggerClass`:**

The trigger class needs to accept label parameters and pass them through.

```typescript
export function generateTriggerClass(
    method: DescMethod, 
    className: string,
    labels: ProcessedLabel[],  // ADD this parameter
): string {
    const triggerClassName = `${className}${method.name}`
    
    // Generate label parameters for constructor
    const labelParams = labels.map(label => 
        `private readonly ${label.name}: ${label.tsType}`
    ).join(',\n    ')
    
    // Generate label fields
    const labelFields = labels.map(label =>
        `  ${label.name}: ${label.tsType}`
    ).join('\n')
    
    return `
/**
 * Trigger implementation for ${method.name}
 */
class ${triggerClassName} implements Trigger<${method.output.name}, ${method.output.name}> {
  public readonly config: ${method.input.name}
${labelFields ? '\n' + labelFields : ''}
  constructor(
    config: ${method.input.name} | ${method.input.name}Json,
    private readonly _capabilityId: string,
    private readonly _method: string,
${labelParams ? '    ' + labelParams + ',' : ''}
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: Needed for runtime type checking of protocol buffer messages
    this.config = (config as any).$typeName ? config as ${method.input.name} : fromJson(${method.input.name}Schema, config as ${method.input.name}Json)
  }

  capabilityId(): string {
    return this._capabilityId;
  }

  method(): string {
    return this._method;
  }

  outputSchema() {
    return ${method.output.name}Schema;
  }

  configAsAny(): Any {
    return anyPack(${method.input.name}Schema, this.config);
  }

  /**
   * Transform the raw trigger output - override this method if needed
   * Default implementation returns the raw output unchanged
   */
  adapt(rawOutput: ${method.output.name}): ${method.output.name} {
    return rawOutput;
  }
}`
}
```

**Update call site in `generate-sdk.ts`:**

```typescript
// Line ~216-219
const triggerClasses = serviceMethods
    .filter((method) => method.methodKind === 'server_streaming')
    .map((method) => generateTriggerClass(method, service.name, labels))  // Pass labels
    .join('\n')
```

## Testing Strategy

### 1. Backward Compatibility Test

**Verify existing ChainSelector still works:**

```bash
# Regenerate SDK
cd packages/cre-sdk
make generate

# Check generated code for EVM capability
cat src/generated-sdk/capabilities/blockchain/evm/v1alpha/client_sdk_gen.ts
```

**Expected output should include:**
- `constructor(private readonly ChainSelector: bigint)`
- `static readonly SUPPORTED_CHAINSELECTORS = { ... }`
- Capability ID template strings with `:ChainSelector:${this.ChainSelector}`

### 2. Multi-Label Support Test

**Create test proto with multiple labels:**

```proto
service TestMultiLabel {
  option (tools.generator.v1alpha.capability) = {
    capability_id: "test-multi@1.0.0"
    labels: {
      key: "ChainSelector"
      value: {
        uint64_label: {
          defaults: [
            { key: "ethereum-mainnet", value: 5009297550715157269 }
          ]
        }
      }
    }
    labels: {
      key: "Environment"
      value: {
        string_label: {
          defaults: [
            { key: "production", value: "prod" },
            { key: "staging", value: "stage" }
          ]
        }
      }
    }
  };
  rpc TestAction(TestRequest) returns (TestResponse);
}
```

**Expected generated code:**

```typescript
export class TestMultiLabelCapability {
  static readonly CAPABILITY_ID = "test-multi@1.0.0";
  static readonly CAPABILITY_NAME = "test-multi";
  static readonly CAPABILITY_VERSION = "1.0.0";
  
  static readonly SUPPORTED_CHAINSELECTORS = {
    "ethereum-mainnet": 5009297550715157269n
  } as const
  
  static readonly SUPPORTED_ENVIRONMENTS = {
    "production": "prod",
    "staging": "stage"
  } as const
  
  constructor(
    private readonly ChainSelector: bigint,
    private readonly Environment: string
  ) {}
  
  testAction(runtime: Runtime<unknown>, input: TestRequest | TestRequestJson) {
    // ...
    const capabilityId = `${TestMultiLabelCapability.CAPABILITY_NAME}:ChainSelector:${this.ChainSelector}:Environment:${this.Environment}@${TestMultiLabelCapability.CAPABILITY_VERSION}`;
    // ...
  }
}
```

### 3. No Labels Test

**Verify capabilities without labels still work:**

```proto
service NoLabels {
  option (tools.generator.v1alpha.capability) = {
    capability_id: "no-labels@1.0.0"
  };
  rpc Action(Request) returns (Response);
}
```

**Expected:**
- No constructor parameters
- Uses static `CAPABILITY_ID` directly
- No SUPPORTED_* constants

### 4. Unit Tests

**Create:** `src/generator/__tests__/label-utils.test.ts`

```typescript
import { describe, test, expect } from 'bun:test'
import { processLabels, generateCapabilityIdLogic, generateLabelSupport } from '../label-utils'

describe('label-utils', () => {
    test('processes uint64 label correctly', () => {
        const capOption = {
            labels: {
                ChainSelector: {
                    kind: {
                        case: 'uint64Label',
                        value: {
                            defaults: { 'ethereum-mainnet': 5009297550715157269 }
                        }
                    }
                }
            }
        }
        
        const labels = processLabels(capOption as any)
        
        expect(labels).toHaveLength(1)
        expect(labels[0].name).toBe('ChainSelector')
        expect(labels[0].type).toBe('bigint')
        expect(labels[0].tsType).toBe('bigint')
    })
    
    test('processes string label correctly', () => {
        const capOption = {
            labels: {
                Environment: {
                    kind: {
                        case: 'stringLabel',
                        value: {
                            defaults: { 'production': 'prod' }
                        }
                    }
                }
            }
        }
        
        const labels = processLabels(capOption as any)
        
        expect(labels).toHaveLength(1)
        expect(labels[0].name).toBe('Environment')
        expect(labels[0].type).toBe('string')
    })
    
    test('handles multiple labels in sorted order', () => {
        const capOption = {
            labels: {
                ZebraLabel: { kind: { case: 'uint32Label', value: {} } },
                AlphaLabel: { kind: { case: 'stringLabel', value: {} } },
            }
        }
        
        const labels = processLabels(capOption as any)
        
        expect(labels).toHaveLength(2)
        expect(labels[0].name).toBe('AlphaLabel')
        expect(labels[1].name).toBe('ZebraLabel')
    })
    
    test('generates capability ID logic with labels', () => {
        const labels = [
            { name: 'ChainSelector', type: 'bigint', tsType: 'bigint', formatExpression: 'this.ChainSelector' },
            { name: 'Environment', type: 'string', tsType: 'string', formatExpression: 'this.Environment' }
        ] as any
        
        const logic = generateCapabilityIdLogic(labels, 'TestCapability')
        
        expect(logic).toContain(':ChainSelector:${this.ChainSelector}')
        expect(logic).toContain(':Environment:${this.Environment}')
        expect(logic).toContain('TestCapability.CAPABILITY_NAME')
    })
})
```

## Migration & Rollout

### Phase 1: Implementation
1. Create `label-utils.ts` with all utility functions
2. Update `generate-sdk.ts` to use utilities
3. Update `generate-action.ts` to use utilities
4. Update `generate-trigger.ts` to use utilities

### Phase 2: Testing
1. Run unit tests for label-utils
2. Regenerate existing capabilities (EVM, HTTP, etc.)
3. Verify no breaking changes in generated code
4. Verify capability ID format matches expected

### Phase 3: Documentation
1. Update README with label documentation
2. Add examples of multi-label capabilities
3. Document label types and their TypeScript mappings

### Phase 4: Validation
1. Test with CRE CLI simulation
2. Verify capability routing works correctly
3. Test with real deployments (if applicable)

## Edge Cases & Considerations

### 1. Optional vs Required Labels
**Current approach:** All labels are required constructor parameters.

**Question:** Should labels be optional?
- Go SDK: Labels are struct fields (required when instantiating)
- TypeScript: Currently optional for ChainSelector
- **Recommendation:** Keep required for now, can add optional support later

### 2. Label Name Conflicts
**Scenario:** Label name conflicts with proto message field

**Solution:** Labels are in the capability class scope, not message scope, so no conflict.

### 3. Label Validation
**Question:** Should we validate label values against defaults?

**Current:** No validation
**Recommendation:** Add runtime validation in future PR

### 4. Capability ID Format Consistency
**Format:** `name:Label1:value1:Label2:value2@version`

**Ordering:** Alphabetical by label name (matching Go implementation)

### 5. Breaking Changes
**Impact:** This is NOT a breaking change for:
- Existing generated code (ChainSelector still works)
- API consumers (constructor signature same for ChainSelector case)

**Risk:** Low - purely additive functionality

## Success Criteria

✅ **Must Have:**
1. All existing EVM tests pass with regenerated code
2. Multi-label proto generates correct TypeScript code
3. No-label proto generates correct TypeScript code
4. Capability ID format matches Go implementation
5. Backward compatible with existing ChainSelector code

✅ **Should Have:**
1. Unit tests for label-utils pass
2. Documentation updated
3. Type safety maintained
4. Code is more maintainable than before

✅ **Nice to Have:**
1. Label validation
2. Optional label support
3. Better error messages for unsupported label types

## Open Questions

1. **Should we support optional labels?**
   - Current: All required
   - Alternative: Use `?` for optional parameters
   - Decision: Keep required for now, add optional in future if needed

2. **Should we validate label values?**
   - Current: No validation
   - Alternative: Runtime checks against defaults
   - Decision: Defer to future PR to keep scope focused

3. **Should label defaults be required?**
   - Current: Defaults are optional in proto
   - Use case: Labels without defaults (free-form values)
   - Decision: Support both with/without defaults

4. **Naming convention for constants?**
   - Current: `SUPPORTED_CHAINSELECTORS`
   - Alternative: `CHAINSELECTOR_VALUES` or `CHAINSELECTOR_DEFAULTS`
   - Decision: Keep `SUPPORTED_*` pattern for consistency

## Timeline Estimate

- **Phase 1 (Implementation):** 4-6 hours
- **Phase 2 (Testing):** 2-3 hours
- **Phase 3 (Documentation):** 1-2 hours
- **Phase 4 (Review & Iteration):** 2-3 hours

**Total:** ~10-14 hours

## Next Steps

1. ✅ Review this implementation plan
2. ⏳ Validate approach with team
3. ⏳ Create feature branch
4. ⏳ Implement Phase 1 (label-utils.ts)
5. ⏳ Implement Phase 2 (refactor generators)
6. ⏳ Write tests
7. ⏳ Regenerate all capabilities
8. ⏳ Validate output
9. ⏳ Create PR
10. ⏳ Deploy

---

**Last Updated:** 2025-11-06  
**Author:** AI Assistant + Team Review  
**Status:** Draft - Awaiting Validation

