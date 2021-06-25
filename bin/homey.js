#!/usr/bin/env node

'use strict';

const yargs = require('yargs');
const updateNotifier = require('update-notifier');
const semver = require('semver');

const pkg = require('../package.json');
const { AthomMessage } = require('..');

const MINIMUM_NODE_VERSION = 'v12.0.0';

try {
  if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
    console.error(`Error: node-homey requires Node.js ${MINIMUM_NODE_VERSION} or higher to run. Please upgrade your Node.js version and try again.`);
    return;
  }
} catch (err) {
  console.error(`Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`);
  return;
}

(async () => {
  await AthomMessage.notify();
  updateNotifier({ pkg }).notify({
    isGlobal: true,
  });

  return yargs
    .commandDir('./cmds')
    .demandCommand()
    .strict()
    .help()
    .argv;
})();
