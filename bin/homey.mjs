'use strict';

import { readFileSync } from 'node:fs';

import updateNotifier from 'update-notifier';
import semver from 'semver';
import yargs from 'yargs';
import Log from '../lib/Log.js';
import AthomMessage from '../services/AthomMessage.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const MINIMUM_NODE_VERSION = 'v22.0.0';

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
  .commandDir('./cmds', {
    extensions: ['.js'],
  })
  .demandCommand()
  .strict()
  .help()
  .parseAsync();
