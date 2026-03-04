# Homey API Homey CLI Recipes

## Command Prefix

Use the installed Homey CLI command:

```bash
homey
```

## Discover Commands

```bash
homey api homey --help
homey api homey schema
homey api homey schema --manager devices
homey api homey schema --manager devices --operation get-devices --json
homey api homey schema --json --jq '.managers | keys'
```

## Typed Manager Examples

```bash
homey api homey devices
homey api homey devices get-device --id <device-id>
homey api homey flow get-flows
homey api homey system get-info
```

## Raw Command Examples

Read-only request:

```bash
homey api homey raw --path /api/manager/system/
```

Token mode:

```bash
homey api homey raw \
  --path /api/manager/system/ \
  --token '<token>' \
  --address 'http://192.168.1.100'
```

POST JSON body:

```bash
homey api homey raw \
  -X POST \
  --path /api/manager/flow/flow \
  --body '{"name":"My Flow"}'
```

POST body from file:

```bash
homey api homey raw \
  -X POST \
  --path /api/manager/flow/flow \
  --body @payload.json
```

Include response metadata and diagnostics:

```bash
homey api homey raw \
  --path /api/manager/system/ \
  --include \
  --verbose
```

## Raw Flags and Constraints

- `--path` must start with `/`.
- `--body` is accepted only for `POST` and `PUT`.
- Repeat `--header 'Name: Value'` to send multiple headers.
- `--request-json=false` sends the body as raw text.
- `--jq '<expr>'` filters JSON output and requires `jq` installed.
- `--json` prints JSON responses and JSON-formatted errors.

## Common Errors

- `No active Homey selected. Run \`homey select\` to choose one.`:
  - Use selected-homey mode only after selecting a Homey, or switch to token mode.
- `Missing required option: --address (required with --token).`:
  - Add `--address` whenever `--token` is provided.
- `Invalid option usage: --address can only be used together with --token.`:
  - Remove `--address` or add `--token`.
- `Invalid path. Please provide an absolute path starting with "/".`:
  - Fix `--path` format.
- `The \`jq\` binary is required for --jq but was not found in PATH.`:
  - Install `jq` or remove `--jq`.
