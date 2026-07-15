# Solana generated-binding fixture

`DataStorage.ts` and `DataStorage_mock.ts` are **tool-generated** by the cre-cli
Solana TypeScript bindings generator from `data_storage.json` (the golden
fixture IDL in cre-cli `cmd/generate-bindings/solana/testdata/contracts/idl/`):

```
cre generate-bindings solana --language typescript
```

Do not edit them by hand. To refresh: regenerate with the cre-cli generator,
copy the output here, then rewrite the package imports to in-repo aliases
(consumer projects resolve the published package; inside this repo the same
classes would otherwise get two type identities, src vs dist):

- `from '@chainlink/cre-sdk'`      -> `from '@cre/sdk'`
- `from '@chainlink/cre-sdk/test'` -> `from '@cre/sdk/test'`

They exist so `solana-binding-e2e.test.ts` can exercise the full generated
write path (struct codec → forwarder envelope → report request → capability
call → SolanaMock), and so `workflow-wasm-check.ts` proves a workflow using a
generated binding compiles Javy → WASM through the committed plugin.
