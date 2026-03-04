---
name: homey-cli-homey-api
description: Homey CLI workflow focused only on `homey api homey` typed and raw commands. Use when a task needs manager or operation discovery via `homey api homey schema`, raw Homey API requests via `homey api homey raw|call|request`, JSON filtering with `--jq`, auth or timeout troubleshooting for Homey API calls, or exact copy-pastable `homey api homey` command sequences.
allowed-tools: Bash(npx homey:*), Bash(homey:*)
---

# Homey CLI `api homey`

## Overview

Operate the `homey api homey` command surface for end users.
Assume the `homey` CLI is installed and available in `PATH`.

## Core Workflow

Every Homey API CLI task follows this sequence:

1. Discover operations with `schema`.
2. Choose typed manager command or `raw`.
3. Choose auth mode (selected Homey or token mode).
4. Set output mode (`--json`, `--jq`, `--include`, `--verbose`).
5. Run command, parse result, and adjust.

```bash
homey api homey schema
homey api homey schema --manager devices --operation get-devices --json
homey api homey devices get-device --id <device-id>
homey api homey raw --path /api/manager/system/
```

## Command Selection

- Use typed manager commands (`devices`, `flow`, `system`) when the operation exists there.
- Use `raw` (or aliases `call`, `request`) when calling a custom path or when manager commands do not expose the needed call.
- Use `schema --json --jq '<expr>'` for machine-readable discovery.

## Essential Commands

```bash
# Discoverability
homey api homey --help
homey api homey schema
homey api homey schema --manager devices
homey api homey schema --manager devices --operation get-devices --json
homey api homey schema --json --jq '.managers | keys'

# Typed manager calls
homey api homey devices
homey api homey devices get-device --id <device-id>
homey api homey flow get-flows
homey api homey system get-info

# Raw calls
homey api homey raw --path /api/manager/system/
homey api homey raw -X POST --path /api/manager/flow/flow --body '{"name":"My Flow"}'
homey api homey raw --path /api/manager/system/ --include --verbose
```

## Common Patterns

### Local selected Homey read call

```bash
homey api homey devices --json
```

### Token mode raw call

```bash
homey api homey raw \
  --path /api/manager/system/ \
  --token '<token>' \
  --address 'http://192.168.1.100'
```

### POST JSON from file

```bash
homey api homey raw \
  -X POST \
  --path /api/manager/flow/flow \
  --body @payload.json
```

## Guardrails

- Confirm intent before mutating requests (`POST`, `PUT`, update/delete operations).
- Require absolute `--path` (must start with `/`) for raw calls.
- Use `--body` only with `POST` or `PUT`.
- Require both `--token` and `--address` together for token mode.
- Do not print secrets (`--token`, Authorization headers) in responses.

## References

- Use [references/commands.md](references/commands.md) for command-level reference.
- Use [references/cli-recipes.md](references/cli-recipes.md) for quick recipes and troubleshooting.
