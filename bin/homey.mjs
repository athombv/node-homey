#!/usr/bin/env node

'use strict';

import { readFileSync } from 'node:fs';

import updateNotifier from 'update-notifier';
import semver from 'semver';
import yargs from 'yargs';
import Log from '../lib/Log.js';
import AthomMessage from '../services/AthomMessage.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const MINIMUM_NODE_VERSION = 'v20.19.0';
const rawArgs = process.argv.slice(2);
const firstCommand = rawArgs.find((arg) => !arg.startsWith('-'));
const isCompletionGeneration = firstCommand === 'completion';
const isCompletionQuery = rawArgs.includes('--get-yargs-completions');
const isCompletionMode = isCompletionGeneration || isCompletionQuery;

const normalizedArgs = [...rawArgs];
if (isCompletionQuery) {
  const completionFlagIndex = normalizedArgs.indexOf('--get-yargs-completions');
  const completionArgsStartIndex = completionFlagIndex + 1;
  const completionArgs = normalizedArgs.slice(completionArgsStartIndex);

  if (completionArgs[0] === 'homey') {
    completionArgs.shift();
  }

  // Some shells send the current token without a trailing empty token when
  // completing in-place (e.g. `homey api<TAB>`). Drop that current token so
  // yargs returns candidates for the current level instead of the next level.
  if (completionArgs.length > 0 && completionArgs[completionArgs.length - 1] !== '') {
    completionArgs.pop();
  }

  normalizedArgs.splice(completionArgsStartIndex, normalizedArgs.length - completionArgsStartIndex, ...completionArgs);
}

try {
  if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
    Log(`Homey CLI requires Node.js ${MINIMUM_NODE_VERSION} or higher.\nPlease upgrade your Node.js version and try again.`);
    process.exit(1);
  }
} catch (err) {
  Log(`Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`);
  process.exit(1);
}

if (!isCompletionMode) {
  await AthomMessage.notify();
  updateNotifier({ pkg }).notify({
    isGlobal: true,
  });
}

await yargs(normalizedArgs)
  .scriptName('homey')
  .commandDir('./cmds', {
    extensions: ['.mjs'],
  })
  .completion('completion', 'Generate shell completion script')
  .demandCommand()
  .strict()
  .help()
  .parseAsync();
