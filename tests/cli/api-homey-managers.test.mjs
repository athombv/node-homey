'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createIsolatedHomeyHome,
  removeHomeyHome,
  runHomey,
} from './helpers.mjs';

function assertFailure(result, command) {
  assert.notStrictEqual(
    result.status,
    0,
    `Expected non-zero exit code for "${command}".\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
  );

  assert.doesNotMatch(result.stdout, /homey update check failed/);
  assert.doesNotMatch(result.stderr, /homey update check failed/);
}

describe('CLI api homey managers', () => {
  it('lists all supported managers in completion', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'homey', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^devices$/m);
    assert.match(result.stdout, /^flow$/m);
    assert.match(result.stdout, /^system$/m);
  });

  it('shows flow manager help and dynamic operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'homey', 'flow', '--help'], homeyHome);
    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /Flow manager operations/);
    assert.match(helpResult.stdout, /get-flows/);

    const completionResult = runHomey(['--get-yargs-completions', 'api', 'homey', 'flow', ''], homeyHome);
    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-flows$/m);
    assert.match(completionResult.stdout, /^create-flow$/m);
  });

  it('shows system manager help and dynamic operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const helpResult = runHomey(['api', 'homey', 'system', '--help'], homeyHome);
    assert.strictEqual(helpResult.status, 0);
    assert.match(helpResult.stdout, /System manager operations/);
    assert.match(helpResult.stdout, /get-info/);

    const completionResult = runHomey(['--get-yargs-completions', 'api', 'homey', 'system', ''], homeyHome);
    assert.strictEqual(completionResult.status, 0);
    assert.match(completionResult.stdout, /^get-info$/m);
    assert.match(completionResult.stdout, /^reboot$/m);
  });

  it('fails with guidance when no Homey is selected for flow default command', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'flow'], homeyHome);

    assertFailure(result, 'homey api homey flow');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('fails with guidance when no Homey is selected for system default command', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'system'], homeyHome);

    assertFailure(result, 'homey api homey system');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });
});
