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

## App build scripts

Control whether the CLI runs your Node.js app's build script with `homey.build` in the
app's `package.json`:

```json
{
  "homey": {
    "build": true
  },
  "scripts": {
    "build": "tsc"
  }
}
```

| `homey.build` | Behavior                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `true`        | Run `npm run build` from the app directory. Requires a nonempty `scripts.build`.                                                     |
| `false`       | Skip the app build script and TypeScript configuration checks.                                                                       |
| Omitted       | Preserve automatic compilation when `devDependencies.typescript` is present, including the existing TypeScript configuration checks. |

Explicit builds can use TypeScript, a bundler, or another tool. The CLI does not inspect
`tsconfig.json` when `homey.build` is explicitly set. Other values, including the string
`"false"`, are rejected.

Homey first generates the Compose manifest, clears `.homeybuild`, and copies source files
and production dependencies into it. Your build script then adds or overwrites generated
deployment files in `.homeybuild`. Preserve the staged manifest, assets, and dependencies;
do not clear the output directory in your script. Existing postprocessing and validation
still apply. Build script failures stop the build.

For a JavaScript app using TypeScript solely to check JSDoc, use:

```json
{
  "homey": {
    "build": false
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

You can install the normal `typescript` development dependency and run `npm run typecheck`
independently. Editor checking remains available. Unlike `--skip-build`, which skips
preprocessing, `homey.build: false` still allows Compose generation, source and dependency
copying, and normal validation.

New JavaScript apps explicitly disable the build script; new TypeScript apps explicitly
enable it. Driver template language is independent of this setting: outside the existing
ESM template branch, the CLI checks an existing `main` entry outside `.homeybuild`, then
root `app.js`/`app.mjs`/`app.cjs` or `app.ts`/`app.mts`/`app.cts` files. Ambiguous or absent
source files fall back to dependency detection.

Older CLI versions ignore `homey.build`; use a CLI release that supports this setting in
both local development and CI. Support is currently unreleased. A future breaking release
may make builds opt-in, but omitted settings retain their existing behavior in this release.
Disabling compilation does not enable native TypeScript execution: TypeScript source files
are still excluded from the deployment copy. Python app builds are unchanged.

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
