import assert from 'node:assert';
import fs from 'node:fs';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');
const COMMANDS_DIR = path.join(REPO_ROOT, 'bin', 'cmds');
const HELP_TEST_CONCURRENCY = Math.min(8, Math.max(2, availableParallelism() - 1));

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

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        HOMEY_SKIP_STARTUP_NOTIFIERS: '1',
        NO_UPDATE_NOTIFIER: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (status) => {
      resolve({
        status,
        stdout,
        stderr,
      });
    });
  });
}

describe('CLI command help', { concurrency: HELP_TEST_CONCURRENCY }, () => {
  const commands = getCommandFiles(COMMANDS_DIR).map(filePathToCommand).sort();

  for (const command of commands) {
    it(`supports --help for "${command}"`, async () => {
      const args = ['bin/homey.mjs', ...command.split(' '), '--help'];
      const result = await runCli(args);

      assert.strictEqual(
        result.status,
        0,
        `Expected exit code 0 for "${command}", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
      );
    });
  }

  it('supports --help through the compatibility JS launcher', async () => {
    const result = await runCli(['bin/homey.js', '--help']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "bin/homey.js --help", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );
  });
});
