import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI select current', () => {
  it('prints a no-active-homey message when no Homey is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current'], homeyHome);
    assertSuccess(result, 'homey select current');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('returns null JSON when no Homey is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current', '--json'], homeyHome);
    assertSuccess(result, 'homey select current --json');
    assert.strictEqual(JSON.parse(result.stdout), null);
  });

  it('prints the active Homey when one is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current'], homeyHome);
    assertSuccess(result, 'homey select current');
    assert.match(result.stdout, /Active Homey: My Homey \(abc\)/);
  });

  it('prints the active Homey as JSON', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
        platform: 'local',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current', '--json'], homeyHome);
    assertSuccess(result, 'homey select current --json');
    assert.deepStrictEqual(JSON.parse(result.stdout), {
      id: 'abc',
      name: 'My Homey',
      platform: 'local',
    });
  });

  it('supports jq filtering when jq is installed', (t) => {
    const jqVersion = spawnSync('jq', ['--version'], {
      encoding: 'utf8',
    });

    if (jqVersion.status !== 0) {
      t.skip('jq is not installed in this environment');
      return;
    }

    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current', '--jq', '.name'], homeyHome);
    assertSuccess(result, 'homey select current --jq .name');
    assert.strictEqual(result.stdout.trim(), '"My Homey"');
  });

  it('returns a clear error when jq is unavailable', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', 'current', '--json', '--jq', '.name'], homeyHome, {
      env: {
        PATH: '',
      },
    });

    assertFailure(result, 'homey select current --json --jq .name');
    assert.match(JSON.parse(result.stdout).error, /jq.*not found/i);
  });
});
