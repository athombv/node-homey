import assert from 'node:assert';
import { describe, it } from 'node:test';

import ApiHomeyTestHelpers from './api-homey-helpers.mjs';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

const DYNAMIC_MANAGER_SCENARIOS = [
  {
    managerId: 'devices',
    managerTitle: /Devices manager operations/,
    listedCommands: ['get-devices', 'update-device', 'open-device', 'schema'],
  },
  {
    managerId: 'flow',
    managerTitle: /Flow manager operations/,
    listedCommands: ['get-flows', 'create-flow', 'schema'],
  },
  {
    managerId: 'system',
    managerTitle: /System manager operations/,
    listedCommands: ['get-info', 'reboot', 'schema'],
  },
];

describe('CLI api', () => {
  it('lists all supported managers in completion', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^api$/m);
    assert.match(result.stdout, /^devices$/m);
    assert.match(result.stdout, /^flow$/m);
    assert.match(result.stdout, /^google-assistant$/m);
    assert.match(result.stdout, /^raw$/m);
    assert.match(result.stdout, /^schema$/m);
    assert.match(result.stdout, /^system$/m);
    assert.doesNotMatch(result.stdout, /^googleAssistant$/m);
  });

  it('supports repeated manager names in CLI completion', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'api', '--help'], homeyHome);

    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /Api manager operations/);
    assert.match(helpResult.stdout, /\bget-state\b/);

    const completionResult = runHomey(['--get-yargs-completions', 'api', 'api', ''], homeyHome);

    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-state$/m);
  });

  it('uses kebab-case manager names for camelCase managers', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'google-assistant', '--help'], homeyHome);

    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /Google Assistant manager operations/);
    assert.match(helpResult.stdout, /\bget-state\b/);

    const completionResult = runHomey(
      ['--get-yargs-completions', 'api', 'google-assistant', ''],
      homeyHome,
    );

    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-state$/m);
    assert.doesNotMatch(completionResult.stdout, /^getState$/m);
  });

  DYNAMIC_MANAGER_SCENARIOS.forEach(({ managerId, managerTitle, listedCommands }) => {
    it(`shows ${managerId} manager help and dynamic commands`, (t) => {
      const homeyHome = createIsolatedHomeyHome();
      t.after(() => removeHomeyHome(homeyHome));

      const helpResult = runHomey(['api', managerId, '--help'], homeyHome);

      assert.strictEqual(helpResult.status, 0);
      assert.match(helpResult.stdout, managerTitle);

      listedCommands.forEach((commandName) => {
        assert.match(helpResult.stdout, new RegExp(`\\b${commandName}\\b`));
      });

      const completionResult = runHomey(
        ['--get-yargs-completions', 'api', managerId, ''],
        homeyHome,
      );

      assert.strictEqual(completionResult.status, 0);

      listedCommands.forEach((commandName) => {
        assert.match(completionResult.stdout, new RegExp(`^${commandName}$`, 'm'));
      });
    });

    it(`lists ${managerId} commands when invoked without a subcommand`, (t) => {
      const homeyHome = createIsolatedHomeyHome();
      t.after(() => removeHomeyHome(homeyHome));

      const result = runHomey(['api', managerId], homeyHome);

      assert.strictEqual(result.status, 0);
      assert.match(result.stdout, managerTitle);

      listedCommands.forEach((commandName) => {
        assert.match(result.stdout, new RegExp(`\\b${commandName}\\b`));
      });
    });
  });

  it('keeps partial operation tokens for completion filtering', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'devices', 'get-d'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-device$/m);
    assert.match(result.stdout, /^get-devices$/m);
  });

  it('shows request options only on generated operation help', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /--timeout/);
    assert.match(result.stdout, /--token/);
    assert.match(result.stdout, /--address/);
    assert.match(result.stdout, /--homey-id/);
    assert.match(result.stdout, /--jq/);
  });

  it('fails with guidance when no Homey is selected in normal mode', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices'], homeyHome);

    assertFailure(result, 'homey api devices get-devices');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('returns JSON-formatted errors when --json is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--json'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --json');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    const payload = JSON.parse(result.stdout);
    assert.match(payload.error, /No active Homey selected/);
  });

  it('requires --address when --token is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--token', 'abc'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --token abc');
    assert.match(result.stdout, /Missing required option: --address or --homey-id/);
  });

  it('rejects using --address and --homey-id together with --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      [
        'api',
        'devices',
        'get-devices',
        '--token',
        'abc',
        '--address',
        'http://127.0.0.1',
        '--homey-id',
        'homey-1',
      ],
      homeyHome,
    );

    assertFailure(
      result,
      'homey api devices get-devices --token abc --address http://127.0.0.1 --homey-id homey-1',
    );
    assert.match(result.stdout, /--address and --homey-id cannot be used together with --token/);
  });

  it('rejects --address without --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'devices', 'get-devices', '--address', 'http://127.0.0.1'],
      homeyHome,
    );

    assertFailure(result, 'homey api devices get-devices --address http://127.0.0.1');
    assert.match(result.stdout, /--address can only be used together with --token/);
  });

  it('rejects non-positive timeout values', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--timeout', '0'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --timeout 0');
    assert.match(result.stdout, /Invalid timeout/);
  });

  it('enforces required operation flags from specification', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-device'], homeyHome);

    assertFailure(result, 'homey api devices get-device');
    assert.match(result.stderr, /Missing required argument: id/);
  });
});
