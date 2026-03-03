'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { describe, it } = require('node:test');

const REPO_ROOT = path.join(__dirname, '..', '..');
const COMMANDS_DIR = path.join(REPO_ROOT, 'bin', 'cmds');

function getCommandFiles(dirPath) {
  const commandFiles = [];

  for (const dirent of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, dirent.name);

    if (dirent.isDirectory()) {
      commandFiles.push(...getCommandFiles(fullPath));
      continue;
    }

    if (dirent.isFile() && dirent.name.endsWith('.mjs')) {
      commandFiles.push(fullPath);
    }
  }

  return commandFiles;
}

function filePathToCommand(filePath) {
  const relative = path.relative(COMMANDS_DIR, filePath);
  return relative
    .replace(/\.mjs$/, '')
    .split(path.sep)
    .join(' ');
}

describe('CLI command help', () => {
  const commands = getCommandFiles(COMMANDS_DIR)
    .map(filePathToCommand)
    .sort();

  for (const command of commands) {
    it(`supports --help for "${command}"`, () => {
      const args = ['bin/homey.mjs', ...command.split(' '), '--help'];
      const result = spawnSync('node', args, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });

      assert.strictEqual(
        result.status,
        0,
        `Expected exit code 0 for "${command}", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
      );
    });
  }

  it('supports --help through the compatibility JS launcher', () => {
    const result = spawnSync('node', ['bin/homey.js', '--help'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "bin/homey.js --help", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );
  });
});
