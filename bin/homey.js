#!/usr/bin/env node

'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const entrypoint = path.join(__dirname, 'homey.mjs');
const nodeFlags = [];

if (
  process.allowedNodeEnvironmentFlags.has('--experimental-strip-types')
  && !process.execArgv.includes('--experimental-strip-types')
) {
  nodeFlags.push('--experimental-strip-types');
}

const child = spawnSync(process.execPath, [
  ...process.execArgv,
  ...nodeFlags,
  entrypoint,
  ...process.argv.slice(2),
], {
  env: process.env,
  stdio: 'inherit',
});

if (child.error) {
  // eslint-disable-next-line no-console
  console.error(child.error);
  process.exit(1);
}

if (typeof child.status === 'number') {
  process.exit(child.status);
}

if (child.signal) {
  process.kill(process.pid, child.signal);
  return;
}

process.exit(1);
