#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import updateNotifier from 'update-notifier';
import semver from 'semver';
import yargs from 'yargs';
import { aliases as rawCommandAliases } from './cmds/api/raw.mjs';
import {
  getHomeyManagerDefinition,
  getHomeyManagerDefinitions,
} from '../lib/api/ApiCommandDefinition.mjs';
import { loadHomeyManagerCommandExtension } from '../lib/api/ApiManagerExtension.mjs';
import { getManagerCommandNames } from '../lib/api/ApiManagerCommand.mjs';
import Log from '../lib/Log.js';
import AthomMessage from '../services/AthomMessage.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const COMMANDS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'cmds');

const MINIMUM_NODE_VERSION = 'v20.19.0';
const rawArgs = process.argv.slice(2);
const firstCommand = rawArgs.find((arg) => !arg.startsWith('-'));
const isCompletionGeneration = firstCommand === 'completion';
const isCompletionQuery = rawArgs.includes('--get-yargs-completions');
const isCompletionMode = isCompletionGeneration || isCompletionQuery;

function isDirectory(targetPath) {
  try {
    return statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function isFile(targetPath) {
  try {
    return statSync(targetPath).isFile();
  } catch {
    return false;
  }
}

function getFileBackedCommandCandidates(commandPath) {
  let currentDir = COMMANDS_DIR;

  for (const token of commandPath) {
    const nextDir = path.join(currentDir, token);
    if (isDirectory(nextDir)) {
      currentDir = nextDir;
      continue;
    }

    const commandFile = path.join(currentDir, `${token}.mjs`);
    if (!isFile(commandFile)) {
      return [];
    }

    if (isDirectory(nextDir)) {
      currentDir = nextDir;
      continue;
    }

    return [];
  }

  try {
    return readdirSync(currentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.mjs'))
      .map((entry) => entry.name.slice(0, -'.mjs'.length));
  } catch {
    return [];
  }
}

function getDynamicCommandCandidates(commandPath) {
  if (commandPath[0] !== 'api') {
    return [];
  }

  if (commandPath.length === 1) {
    return [
      ...getHomeyManagerDefinitions().map(
        (managerDefinition) => managerDefinition.managerIdCamelCase,
      ),
      ...rawCommandAliases,
    ];
  }

  if (commandPath.length === 2) {
    const managerDefinition = getHomeyManagerDefinition(commandPath[1]);

    if (!managerDefinition) {
      return [];
    }

    const extension = loadHomeyManagerCommandExtension(managerDefinition.managerIdCamelCase);

    return getManagerCommandNames(managerDefinition, extension);
  }

  return [];
}

function getCommandCandidates(commandPath) {
  const fileBackedCandidates = getFileBackedCommandCandidates(commandPath);
  const dynamicCandidates = getDynamicCommandCandidates(commandPath);

  return [...new Set([...fileBackedCandidates, ...dynamicCandidates])];
}

function shouldDropCurrentCompletionToken(completionArgs) {
  const currentToken = completionArgs[completionArgs.length - 1];
  if (currentToken === '') {
    return false;
  }

  const commandPath = completionArgs.slice(0, -1);
  const candidateSet = new Set(getCommandCandidates(commandPath));

  return candidateSet.has(currentToken);
}

const normalizedArgs = [...rawArgs];
if (isCompletionQuery) {
  const completionFlagIndex = normalizedArgs.indexOf('--get-yargs-completions');
  const completionArgsStartIndex = completionFlagIndex + 1;
  const completionArgs = normalizedArgs.slice(completionArgsStartIndex);

  if (completionArgs[0] === 'homey') {
    completionArgs.shift();
  }

  // Some shells send the current token without a trailing empty token when
  // completing in-place (e.g. `homey api<TAB>`). Only drop the token when it
  // already fully matches a known command at this level.
  if (completionArgs.length > 0 && shouldDropCurrentCompletionToken(completionArgs)) {
    completionArgs.pop();
  }

  normalizedArgs.splice(
    completionArgsStartIndex,
    normalizedArgs.length - completionArgsStartIndex,
    ...completionArgs,
  );
}

try {
  if (semver.lt(process.version, MINIMUM_NODE_VERSION)) {
    Log(
      `Homey CLI requires Node.js ${MINIMUM_NODE_VERSION} or higher.\nPlease upgrade your Node.js version and try again.`,
    );
    process.exit(1);
  }
} catch (err) {
  Log(
    `Failed to determine Node.js version, please make sure you're using version ${MINIMUM_NODE_VERSION} or higher.`,
  );
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
  .version('version', 'Show version number', pkg.version)
  .alias('version', 'v')
  .global(['version', 'v'], false)
  .commandDir('./cmds', {
    extensions: ['.mjs'],
  })
  .completion('completion', 'Generate shell completion script')
  .demandCommand()
  .strict()
  .help()
  .parseAsync();
