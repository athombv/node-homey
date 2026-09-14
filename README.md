# Homey

Command-line interface and type declarations for Homey Apps.

## Installation

```bash
$ npm i -g homey
```

## Getting started

To get started run:

```bash
$ homey --help
```

Or read the [getting started](https://apps.developer.homey.app/the-basics/getting-started) documentation.

## Testing

Run the hermetic test suite without a Homey, account credentials, network access, or Docker:

```bash
npm test
```

Run the same suite with production coverage and the repository coverage thresholds:

```bash
npm run test:coverage
```

The app lifecycle tests copy the example apps in `tests/fixtures/apps` to temporary directories
before building or modifying them.

### Optional Docker smoke test

With a local Docker daemon running, verify the real Docker connection and container lifecycle:

```bash
npm run test:docker
```

The smoke test pulls `alpine:3.20` when it is not available locally, runs a one-shot labeled
container, and removes the container afterward. It is not part of normal tests or CI. Override the
image with `HOMEY_TEST_DOCKER_IMAGE` or the socket with `HOMEY_TEST_DOCKER_SOCKET` when needed.

## Releasing

Maintainers can find the stable and testing release procedures in [RELEASING.md](RELEASING.md).

## Shell completion

### Bash

Add this line to your `~/.bashrc`:

```bash
homey completion >> ~/.bashrc
```

Then restart your shell, or run:

```bash
source ~/.bashrc
```

### Zsh

Add this line to your `~/.zshrc`:

```bash
SHELL=/bin/zsh homey completion >> ~/.zshrc
```

Then restart your shell, or run:

```bash
source ~/.zshrc
```

## USB connections

USB discovery is now opt-in. Existing USB workflows must add `--usb` or set `HOMEY_USB=1`.
Normal commands use their network connection strategies and do not probe USB candidate addresses.

```bash
homey list --usb
homey select --usb
homey app run --usb
homey app install --usb
homey api system get-info --usb
homey api raw --usb --path /api/manager/system/
homey api diagnose --usb
```

`list --usb` and `select --usb` show only USB-connected Homeys, including devices whose cached
Cloud status is offline. Selection saves the Homey, not USB mode. For subsequent commands,
pass `--usb` again or enable it for your development shell:

```bash
export HOMEY_USB=1
homey app run
homey list --no-usb
```

Explicit `--no-usb` overrides the shell setting. USB mode requires a local Homey using API v3
and fails if the selected or requested Homey is not found over USB; it does not fall back to LAN
or Cloud transport. Account lookup and authentication or session renewal can still require
Athom Cloud. USB discovery probes unique candidate addresses concurrently with a one-second
timeout and does not persist discovery results in the account cache.

`homey app run --remote --usb` runs the app on Homey over USB. API token mode supports
`--token <TOKEN> --homey-id <HOMEY_ID> --usb`. An explicit `--address` cannot be combined with
enabled USB mode; add `--no-usb` if your shell enables it. `api diagnose --usb` checks only USB
connectivity. The `api raw` aliases `call` and `request` also accept `--usb`.

## Homey API CLI

Use `homey api` for direct Homey API access.

### Account caching and rate limits

The CLI caches your account profile and Homey connection details on disk for five minutes,
so successive commands can reuse them. The cache is stored separately in `profile-cache.json`
alongside `settings.json`, so refreshing it does not rewrite account or active Homey settings.
Once the cache expires, the next command refreshes it.
If that refresh receives HTTP 429, the CLI continues with the cached data and waits at least
one minute before attempting another profile refresh. Live Homey API responses are not cached.

Use `homey list --refresh` or `homey whoami --refresh` to refresh account data before the cache
expires. These options still respect the rate-limit cooldown and fall back to cached data on 429.
Logging in or out clears the profile cache. Cached profiles are bound to the OAuth access token
or PAT that fetched them, so a different credential (including a rotated OAuth token) starts a new
cache. Concurrent updates preserve newer profile data and active cooldowns. Cache I/O failures
produce a warning without discarding a fetched profile or an available rate-limit fallback.

A first login or an expired Homey session can still require Cloud API access. Without cached
account data, a profile request that receives HTTP 429 still fails. For direct local API access,
`homey api` also supports `--token <TOKEN> --address <URL>` without an account lookup.

### Raw requests

```bash
homey api raw --path /api/manager/system/
homey api raw --homey-id <HOMEY_ID> --path /api/manager/system/
homey api raw -X POST --path /api/manager/flow/flow --body '{"name":"Test Flow"}'
homey api raw -X POST --path /api/manager/flow/flow --body @payload.json
homey api raw --path /api/manager/system/ --token <TOKEN> --address http://192.168.1.100
homey api raw --path /api/manager/system/ --token <TOKEN> --homey-id <HOMEY_ID>
```

`--body` is only supported for `POST` and `PUT`, matching the `homey-api` call behavior.

### Schema introspection

```bash
homey api schema
homey api schema --manager devices --operation get-devices --json
homey api schema --json --jq '.managers | keys'
```

`--jq` requires the `jq` binary to be installed and available in `PATH`.

## Homey Apps SDK Documentation

Please visit https://homey.app/developer for more information.

## Useful links

### Z-Wave

The `zwave` installs [homey-zwavedriver](https://www.npmjs.com/package/homey-zwavedriver).

### Zigbee

The `zigbee` installs [homey-zigbeedriver](https://www.npmjs.com/package/homey-zigbeedriver).

### RF

The `rf` installs [homey-rfdriver](https://www.npmjs.com/package/homey-rfdriver), and copies pairing templates to `/.homeycompose/`.

### OAuth2

The `oauth2` installs [homey-oauth2app](https://github.com/athombv/node-homey-oauth2app).

### Log

The `log` installs [homey-log](https://www.npmjs.com/package/homey-log). You must still require the module in the app yourself:

```
const Log = require('homey-log');
```

Don't forget to add the `HOMEY_LOG_URL` variable to your `env.json`.
