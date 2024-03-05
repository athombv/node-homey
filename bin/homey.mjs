#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import updateNotifier from 'update-notifier';
import semver from 'semver';

import Log from '../lib/Log.js';
import AthomMessage from '../services/AthomMessage.js';

import docs from './cmds/docs.js'

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pkg = require('../package.json');

// Ensure the minimum Node.js version is high enough
const MINIMUM_NODE_VERSION = 'v18.0.0';

(async () => {
  try {
    if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
      Log(`Homey CLI requires Node.js ${MINIMUM_NODE_VERSION} or higher.\nPlease upgrade your Node.js version and try again.`);
      return;
    }
  } catch (err) {
    Log(`Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`);
    return;
  }

  await AthomMessage.notify();
  updateNotifier({ pkg }).notify({
    isGlobal: true,
  });

  return yargs(hideBin(process.argv))
    .command(docs)
    .strict()
    .help()
    .argv;
})();
