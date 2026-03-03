import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

export function createIsolatedHomeyHome(extraSettings = {}) {
  const homeyHome = fs.mkdtempSync(path.join(os.tmpdir(), 'homey-cli-'));
  const settings = {
    athomMessageLastCheck: new Date().toString(),
    ...extraSettings,
  };

  fs.writeFileSync(path.join(homeyHome, 'settings.json'), JSON.stringify(settings, null, 4));
  return homeyHome;
}

export function runHomey(args, homeyHome) {
  return spawnSync('node', ['bin/homey.mjs', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOMEY_HOME: homeyHome,
      NO_UPDATE_NOTIFIER: '1',
    },
  });
}

export function assertSuccess(result, command) {
  assert.strictEqual(
    result.status,
    0,
    `Expected exit code 0 for "${command}", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
  );

  assert.doesNotMatch(result.stdout, /homey update check failed/);
  assert.doesNotMatch(result.stderr, /homey update check failed/);
}

export function removeHomeyHome(homeyHome) {
  fs.rmSync(homeyHome, { recursive: true, force: true });
}
