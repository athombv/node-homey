'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api flow', () => {
  it('shows manager help and dynamic operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'flow', '--help'], homeyHome);
    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /Flow manager operations/);
    assert.match(helpResult.stdout, /get-flows/);

    const completionResult = runHomey(['--get-yargs-completions', 'api', 'flow', ''], homeyHome);
    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-flows$/m);
    assert.match(completionResult.stdout, /^create-flow$/m);
  });

  it('fails with guidance when no Homey is selected for default command', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'flow'], homeyHome);

    assertFailure(result, 'homey api flow');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });
});
