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

Or read the [getting started](https://apps.developer.athom.com/tutorial-Getting%20Started.html) documentation.

## Plugins

This package ships with built-in plugins to make the development workflow easier. Plugins must be defined in `/.homeyplugins.json` in your app's root, and are executed in order.

### Compose
The `compose` plugin copies & merges files, which is useful for very large Homey Apps.

For documentation, refer to [Homey Compose](https://apps.developer.athom.com/tutorial-Homey%20Compose.html).

### Z-Wave
The `zwave` plugin installs [homey-meshdriver](https://www.npmjs.com/package/homey-meshdriver).

For documentation, refer to [AppPluginZwave](lib/AppPluginZwave/index.js).

### Zigbee
The `zigbee` plugin installs [homey-meshdriver](https://www.npmjs.com/package/homey-meshdriver).

For documentation, refer to [AppPluginZigbee](lib/AppPluginZigbee/index.js).

### RF
The `rf` plugin installs [homey-rfdriver](https://www.npmjs.com/package/homey-rfdriver), and copies pairing templates to `/.homeycompose/`.

For documentation, refer to [AppPluginRF](lib/AppPluginRF/index.js).

### OAuth2
The `oauth2` plugin installs [homey-oauth2app](https://github.com/athombv/node-homey-oauth2app).

For documentation, refer to [AppPluginOAuth2](lib/AppPluginOAuth2/index.js).

### Log
The `log` plugin installs [homey-log](https://www.npmjs.com/package/homey-log). You must still require the module in the app yourself:

```
const { Log } = require('homey-log');
```

Don't forget to add the `HOMEY_LOG_URL` variable to your `env.json`.

## Homey Apps SDK Documentation
Please visit https://developer.athom.com for more information.
