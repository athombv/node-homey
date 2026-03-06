# Command Reference

Use this reference for exact `homey api` command syntax.

## Prefix

Use the installed Homey CLI command:

```bash
homey
```

## Top-Level API

```bash
homey api --help
```

Global options inherited by all subcommands:

- `--json`
- `--timeout <ms>`
- `--token <token>`
- `--address <url>`

## Schema Command

```bash
homey api schema
homey api schema --manager devices
homey api schema --operation get-devices
homey api schema --manager devices --operation get-devices --json
homey api schema --json --jq '.managers | keys'
```

Schema options:

- `--manager <idCamelCase|managerId|specKey>`
- `--operation <operationId|kebab-cli-name>`
- `--jq '<expr>'` (requires `jq`)

## Typed Manager Commands

```bash
homey api devices --help
homey api flow --help
homey api system --help
```

Common examples:

```bash
homey api devices
homey api devices get-device --id <device-id>
homey api flow get-flows
homey api system get-info
```

## Raw Command

Aliases:

- `homey api raw ...`
- `homey api call ...`
- `homey api request ...`

Examples:

```bash
homey api raw --path /api/manager/system/
homey api raw -X POST --path /api/manager/flow/flow --body '{"name":"My Flow"}'
homey api raw -X POST --path /api/manager/flow/flow --body @payload.json
homey api raw --path /api/manager/system/ --include --verbose
homey api raw --path /api/manager/system/ --json --jq '.name'
```

Raw-specific options:

- `-X, --method <METHOD>` (default `GET`)
- `--path <absolute-path>`
- `-H, --header 'Name: Value'` (repeatable)
- `--body <json-or-@file>`
- `--request-json[=true|false]` (default `true`)
- `--jq '<expr>'` (requires `jq`)
- `--include`
- `--verbose`

## Constraints and Validation Rules

- `--path` must start with `/`.
- `--body` is valid only for `POST` and `PUT`.
- `--token` requires `--address`.
- `--address` is invalid without `--token`.
- `--timeout` must be a positive number.

## Auth Modes

Selected Homey mode (default):

```bash
homey select
homey api devices
```

Token mode:

```bash
homey api raw \
  --path /api/manager/system/ \
  --token '<token>' \
  --address 'http://192.168.1.100'
```

## Common Failure Messages

- `No active Homey selected. Run \`homey select\` to choose one.`
- `Missing required option: --address (required with --token).`
- `Invalid option usage: --address can only be used together with --token.`
- `Invalid path. Please provide an absolute path starting with "/".`
- `Invalid option usage: --body is only supported with methods POST, PUT.`
- `The \`jq\` binary is required for --jq but was not found in PATH.`
