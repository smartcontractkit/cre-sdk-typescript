# Solana On-Chain Write Example

Writes a Borsh-encoded `UserData` report to an Anchor program (`DataStorage`)
on Solana devnet through the keystone-forwarder, using a cre-cli generated
TypeScript binding.

## What it demonstrates

- `SolanaClient` + `writeReport` through a generated binding (`DataStorage.ts`)
- `@solana/addresses` for base58 address validation in the config schema
- `@solana/codecs` for Borsh struct encoding (inside the binding) and
  base58-rendering the returned transaction signature

## Generated binding

`DataStorage.ts` was generated from the program's Anchor IDL with cre-cli:

```bash
cre generate-bindings solana --language typescript
```

Do not edit it by hand — regenerate from the IDL instead.

## Account layout

`remainingAccounts` must follow the keystone-forwarder layout. Order matters:
the full list is hashed into the report and verified on-chain.

| Index | Account | Notes |
|-------|---------|-------|
| 0 | `forwarderState` | The forwarder program's state account (writable) |
| 1 | `forwarderAuthority` | PDA of `["forwarder", forwarderState, receiverProgram]` under the forwarder program |
| 2+ | receiver accounts | Whatever the receiver's `on_report` instruction needs (here: user, data account PDA, system program) |

The forwarder strips indices 0 and 1 before CPI-ing into the receiver program.

## Config

The addresses in `config.json` are placeholders — replace `forwarderState`,
`forwarderAuthority`, and the receiver accounts with the real devnet accounts
for your deployment before running.
