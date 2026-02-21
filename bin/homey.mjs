'use strict';

import { createRequire } from 'node:module';

import yargs from 'yargs';

const require = createRequire(import.meta.url);
const updateNotifier = require('update-notifier');
const semver = require('semver');
const pkg = require('../package.json');
const Log = require('../lib/Log');
const AthomMessage = require('../services/AthomMessage');

const MINIMUM_NODE_VERSION = 'v20.19.0';

try {
  if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
    Log(`Homey CLI requires Node.js ${MINIMUM_NODE_VERSION} or higher.\nPlease upgrade your Node.js version and try again.`);
    process.exit(1);
  }
} catch (err) {
  Log(`Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`);
  process.exit(1);
}

await AthomMessage.notify();
updateNotifier({ pkg }).notify({
  isGlobal: true,
});

await yargs(process.argv.slice(2))
  .scriptName('homey')
  .commandDir('./cmds')
  .demandCommand()
  .strict()
  .help()
  .parseAsync();
