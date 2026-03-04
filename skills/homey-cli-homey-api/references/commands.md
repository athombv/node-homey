# Command Reference

Use this reference for exact `homey api homey` command syntax.

## Prefix

Use the installed Homey CLI command:

```bash
homey
```

## Top-Level API Homey

```bash
homey api homey --help
```

Global options inherited by all subcommands:

- `--json`
- `--timeout <ms>`
- `--token <token>`
- `--address <url>`

## Schema Command

```bash
homey api homey schema
homey api homey schema --manager devices
homey api homey schema --operation get-devices
homey api homey schema --manager devices --operation get-devices --json
homey api homey schema --json --jq '.managers | keys'
```

Schema options:

- `--manager <idCamelCase|managerId|specKey>`
- `--operation <operationId|kebab-cli-name>`
- `--jq '<expr>'` (requires `jq`)

## Typed Manager Commands

```bash
homey api homey devices --help
homey api homey flow --help
homey api homey system --help
```

Common examples:

```bash
homey api homey devices
homey api homey devices get-device --id <device-id>
homey api homey flow get-flows
homey api homey system get-info
```

## Raw Command

Aliases:

- `homey api homey raw ...`
- `homey api homey call ...`
- `homey api homey request ...`

Examples:

```bash
homey api homey raw --path /api/manager/system/
homey api homey raw -X POST --path /api/manager/flow/flow --body '{"name":"My Flow"}'
homey api homey raw -X POST --path /api/manager/flow/flow --body @payload.json
homey api homey raw --path /api/manager/system/ --include --verbose
homey api homey raw --path /api/manager/system/ --json --jq '.name'
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
homey api homey devices
```

Token mode:

```bash
homey api homey raw \
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
