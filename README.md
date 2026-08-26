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

## Homey API CLI

Use `homey api` for direct Homey API access.

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
