import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api schema', () => {
  it('shows help without requiring an active Homey', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'schema', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Inspect available Homey API managers and operations/);
    assert.match(result.stdout, /--manager/);
    assert.match(result.stdout, /--operation/);
    assert.match(result.stdout, /--json/);
    assert.doesNotMatch(result.stdout, /--timeout/);
    assert.doesNotMatch(result.stdout, /--token/);
    assert.doesNotMatch(result.stdout, /--address/);
    assert.doesNotMatch(result.stdout, /--homey-id/);
  });

  it('prints a human-readable schema summary by default', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'schema'], homeyHome);

    assertSuccess(result, 'homey api schema');
    assert.match(result.stdout, /devices/i);
    assert.match(result.stdout, /get-devices/);
    assert.match(result.stdout, /Platform labels:/);
    assert.match(result.stdout, /Platform/);
    assert.match(result.stdout, /Scopes/);
  });

  it('supports manager and operation filters', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'schema', '--manager', 'devices', '--operation', 'get-devices', '--json'],
      homeyHome,
    );

    assertSuccess(result, 'homey api schema --manager devices --operation get-devices --json');
    const payload = JSON.parse(result.stdout);
    assert.ok(payload.managers);
    assert.ok(payload.managers.ManagerDevices);
    assert.ok(payload.managers.ManagerDevices.operations.getDevices);
    assert.strictEqual(payload.managers.ManagerDevices.operations.getDevices.availability, 'both');
  });

  it('supports schema via generated manager commands', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'devices', 'schema', '--operation', 'get-devices', '--json'],
      homeyHome,
    );

    assertSuccess(result, 'homey api devices schema --operation get-devices --json');
    const payload = JSON.parse(result.stdout);
    assert.ok(payload.managers);
    assert.ok(payload.managers.ManagerDevices);
    assert.ok(payload.managers.ManagerDevices.operations.getDevices);
  });

  it('hides the manager option on manager-scoped schema help', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'schema', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /--operation/);
    assert.match(result.stdout, /--json/);
    assert.doesNotMatch(result.stdout, /--manager/);
    assert.doesNotMatch(result.stdout, /--timeout/);
  });

  it('shows platform-exclusive availability in human-readable output', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'schema', '--manager', 'system', '--operation', 'delete'],
      homeyHome,
    );

    assertSuccess(result, 'homey api schema --manager system --operation delete');
    assert.match(result.stdout, /Homey Cloud/);
    assert.match(result.stdout, /\bcloud\b/);
  });

  it('prints required params on separate lines in human-readable output', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'schema', '--manager', 'devices', '--operation', 'set-capability-value'],
      homeyHome,
    );

    assertSuccess(result, 'homey api schema --manager devices --operation set-capability-value');
    assert.match(
      result.stdout,
      /capability-id \(path\)[\s\S]*device-id \(path\)[\s\S]*value \(body\)/,
    );
    assert.match(result.stdout, /homey\.device\.control/);
  });

  it('exposes platform-exclusive availability in json output', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'schema', '--manager', 'system', '--operation', 'delete', '--json'],
      homeyHome,
    );

    assertSuccess(result, 'homey api schema --manager system --operation delete --json');
    const payload = JSON.parse(result.stdout);
    assert.strictEqual(payload.managers.ManagerSystem.operations.delete.availability, 'cloud');
  });

  it('returns an error for unknown filters', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'schema', '--manager', 'missing-manager'], homeyHome);

    assertFailure(result, 'homey api schema --manager missing-manager');
    assert.match(result.stdout, /No manager matched filter "missing-manager"/);
  });

  it('supports jq filtering when jq is installed', (t) => {
    const jqVersion = spawnSync('jq', ['--version'], {
      encoding: 'utf8',
    });

    if (jqVersion.status !== 0) {
      t.skip('jq is not installed in this environment');
      return;
    }

    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'schema', '--json', '--jq', '.managers | keys | length'],
      homeyHome,
    );

    assertSuccess(result, 'homey api schema --json --jq .managers|keys|length');
    assert.match(result.stdout, /^[0-9]+\s*$/);
  });

  it('returns a clear error when jq is unavailable', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'schema', '--json', '--jq', '.managers'], homeyHome, {
      env: {
        PATH: '',
      },
    });

    assertFailure(result, 'homey api schema --json --jq .managers');
    const payload = JSON.parse(result.stdout);
    assert.match(payload.error, /jq.*not found/i);
  });
});
