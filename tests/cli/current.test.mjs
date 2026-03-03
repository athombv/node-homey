import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

function createIsolatedHomeyHome(extraSettings = {}) {
  const homeyHome = fs.mkdtempSync(path.join(os.tmpdir(), 'homey-cli-'));
  const settings = {
    athomMessageLastCheck: new Date().toString(),
    ...extraSettings,
  };

  fs.writeFileSync(path.join(homeyHome, 'settings.json'), JSON.stringify(settings, null, 4));
  return homeyHome;
}

function runHomey(args, homeyHome) {
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

function assertSuccess(result, command) {
  assert.strictEqual(
    result.status,
    0,
    `Expected exit code 0 for "${command}", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
  );

  assert.doesNotMatch(result.stdout, /homey update check failed/);
  assert.doesNotMatch(result.stderr, /homey update check failed/);
}

describe('CLI current', () => {
  it('prints a no-active-homey message when no Homey is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => fs.rmSync(homeyHome, { recursive: true, force: true }));

    const result = runHomey(['current'], homeyHome);
    assertSuccess(result, 'homey current');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('prints the active Homey when one is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => fs.rmSync(homeyHome, { recursive: true, force: true }));

    const result = runHomey(['current'], homeyHome);
    assertSuccess(result, 'homey current');
    assert.match(result.stdout, /Active Homey: My Homey \(abc\)/);
  });
});
