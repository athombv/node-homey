'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createIsolatedHomeyHome,
  removeHomeyHome,
  runHomey,
} from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api homey devices', () => {
  it('shows manager help without requiring an active Homey', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Devices manager operations/);
    assert.match(result.stdout, /get-devices/);
  });

  it('provides dynamic completion entries for devices operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'homey', 'devices', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-devices$/m);
    assert.match(result.stdout, /^update-device$/m);
  });

  it('keeps partial operation tokens for completion filtering', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'homey', 'devices', 'get-d'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-device$/m);
    assert.match(result.stdout, /^get-devices$/m);
  });

  it('fails with guidance when no Homey is selected in normal mode', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices'], homeyHome);

    assertFailure(result, 'homey api homey devices');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('returns JSON-formatted errors when --json is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--json'], homeyHome);

    assertFailure(result, 'homey api homey devices --json');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    const payload = JSON.parse(result.stdout);
    assert.match(payload.error, /No active Homey selected/);
  });

  it('requires --address when --token is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--token', 'abc'], homeyHome);

    assertFailure(result, 'homey api homey devices --token abc');
    assert.match(result.stdout, /Missing required option: --address/);
  });

  it('rejects --address without --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--address', 'http://127.0.0.1'], homeyHome);

    assertFailure(result, 'homey api homey devices --address http://127.0.0.1');
    assert.match(result.stdout, /--address can only be used together with --token/);
  });

  it('rejects non-positive timeout values', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--timeout', '0'], homeyHome);

    assertFailure(result, 'homey api homey devices --timeout 0');
    assert.match(result.stdout, /Invalid timeout/);
  });

  it('enforces required operation flags from specification', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', 'get-device'], homeyHome);

    assertFailure(result, 'homey api homey devices get-device');
    assert.match(result.stderr, /Missing required argument: id/);
  });
});
