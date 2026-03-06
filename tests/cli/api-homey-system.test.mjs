'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api system', () => {
  it('shows manager help and dynamic operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'system', '--help'], homeyHome);
    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /System manager operations/);
    assert.match(helpResult.stdout, /get-info/);

    const completionResult = runHomey(['--get-yargs-completions', 'api', 'system', ''], homeyHome);
    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-info$/m);
    assert.match(completionResult.stdout, /^reboot$/m);
  });

  it('fails with guidance when no Homey is selected for default command', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'system'], homeyHome);

    assertFailure(result, 'homey api system');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });
});
