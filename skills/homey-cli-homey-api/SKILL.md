---
name: homey-cli-homey-api
description: Homey CLI workflow focused only on `homey api` typed and raw commands. Use when a task needs manager or operation discovery via `homey api schema`, raw Homey API requests via `homey api raw|call|request`, JSON filtering with `--jq`, auth or timeout troubleshooting for Homey API calls, or exact copy-pastable `homey api` command sequences.
---

# Homey CLI `api`

## Overview

Operate the `homey api` command surface for end users.
Assume the `homey` CLI is installed and available in `PATH`.

## Core Workflow

Every Homey API CLI task follows this sequence:

1. Discover operations with `schema`.
2. Choose typed manager command or `raw`.
3. Choose auth mode (selected Homey or token mode).
4. Set output mode (`--json`, `--jq`, `--include`, `--verbose`).
5. Run command, parse result, and adjust.

```bash
homey api schema
homey api schema --manager devices --operation get-devices --json
homey api devices get-device --id <device-id>
homey api raw --path /api/manager/system/
```

## Command Selection

- Use typed manager commands (`devices`, `flow`, `system`) when the operation exists there.
- Use `raw` (or aliases `call`, `request`) when calling a custom path or when manager commands do not expose the needed call.
- Use `schema --json --jq '<expr>'` for machine-readable discovery.

## Essential Commands

```bash
# Discoverability
homey api --help
homey api schema
homey api schema --manager devices
homey api schema --manager devices --operation get-devices --json
homey api schema --json --jq '.managers | keys'

# Typed manager calls
homey api devices
homey api devices get-device --id <device-id>
homey api flow get-flows
homey api system get-info

# Raw calls
homey api raw --path /api/manager/system/
homey api raw -X POST --path /api/manager/flow/flow --body '{"name":"My Flow"}'
homey api raw --path /api/manager/system/ --include --verbose
```

## Common Patterns

### Local selected Homey read call

```bash
homey api devices --json
```

### Token mode raw call

```bash
homey api raw \
  --path /api/manager/system/ \
  --token '<token>' \
  --address 'http://192.168.1.100'
```

### POST JSON from file

```bash
homey api raw \
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
