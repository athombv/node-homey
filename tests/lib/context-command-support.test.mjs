import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  applyContextOutputOptions,
  logManagementError,
  printAuthenticationProfile,
  printAuthenticationProfiles,
  printContext,
  printContexts,
  toAuthenticationProfileOutput,
  toContextOutput,
} from '../../lib/ContextCommandSupport.mjs';

function contextEntry(overrides = {}) {
  return {
    name: 'lab',
    current: true,
    context: {
      description: 'Lab context',
      target: { homeyId: 'homey-1', name: 'Lab Homey', platform: 'local' },
      authenticationProfile: 'work',
      homeyAuthentication: {
        source: 'stored',
        credentialId: 'secret-id',
        store: 'settings',
      },
      route: { type: 'discovery', strategies: ['local', 'cloud'] },
    },
    health: { status: 'ready', reasons: [] },
    ...overrides,
  };
}

function profileEntry(overrides = {}) {
  return {
    name: 'work',
    profile: {
      accountId: 'account-1',
      email: 'developer@example.com',
      displayName: 'Homey Developer',
      credentialSource: {
        type: 'oauth',
        credentialId: 'secret-id',
        store: 'settings',
      },
    },
    usable: true,
    reason: null,
    referencedBy: ['lab'],
    ...overrides,
  };
}

function captureConsole(t) {
  const logs = [];
  const errors = [];
  t.mock.method(console, 'log', (...values) => logs.push(values.join(' ')));
  t.mock.method(console, 'error', (...values) => errors.push(values.join(' ')));
  return { logs, errors };
}

describe('ContextCommandSupport', () => {
  it('adds the JSON output option to command builders', () => {
    const calls = [];
    const yargs = {
      option(name, options) {
        calls.push({ name, options });
        return this;
      },
    };

    assert.strictEqual(applyContextOutputOptions(yargs), yargs);
    assert.deepStrictEqual(calls, [
      {
        name: 'json',
        options: {
          type: 'boolean',
          default: false,
          description: 'Output raw JSON',
        },
      },
    ]);
  });

  it('logs management errors as structured JSON or human-readable text', (t) => {
    const { errors } = captureConsole(t);

    logManagementError(new Error('broken'), { json: true });
    logManagementError('plain failure');

    assert.deepStrictEqual(JSON.parse(errors[0]), { error: 'broken' });
    assert.strictEqual(errors[1], 'Error: plain failure');
  });

  it('redacts context credentials and derives configured capabilities', () => {
    assert.deepStrictEqual(toContextOutput(contextEntry()), {
      name: 'lab',
      current: true,
      description: 'Lab context',
      target: { homeyId: 'homey-1', name: 'Lab Homey', platform: 'local' },
      authenticationProfile: 'work',
      homeyAuthentication: {
        source: 'stored',
        credentialId: '[REDACTED]',
        store: 'settings',
      },
      capabilities: { account: true, homey: true },
      route: { type: 'discovery', strategies: ['local', 'cloud'] },
      health: { status: 'ready', reasons: [] },
    });

    const minimal = toContextOutput(
      contextEntry({
        current: false,
        context: {
          target: {},
          homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
          route: { type: 'address', address: 'http://homey.local' },
        },
      }),
    );
    assert.strictEqual(minimal.description, null);
    assert.deepStrictEqual(minimal.target, { homeyId: null, name: null, platform: null });
    assert.strictEqual(minimal.authenticationProfile, null);
    assert.strictEqual(minimal.homeyAuthentication.credentialId, undefined);
  });

  it('prints context lists as JSON and human tables for each route type', (t) => {
    const { logs } = captureConsole(t);
    const entries = [
      contextEntry(),
      contextEntry({
        name: 'direct',
        current: false,
        context: {
          target: {},
          homeyAuthentication: { source: 'environment', variable: 'TOKEN' },
          route: { type: 'address', address: 'http://homey.local' },
        },
        health: { status: 'degraded', reasons: ['warning'] },
      }),
      contextEntry({
        name: 'usb',
        current: false,
        context: {
          target: { homeyId: 'homey-2' },
          authenticationProfile: 'work',
          route: { type: 'usb' },
        },
      }),
    ];

    printContexts(entries, { json: true });
    printContexts(entries, {});

    assert.strictEqual(JSON.parse(logs[0]).length, 3);
    assert.match(logs[1], /Lab Homey/);
    assert.match(logs[1], /http:\/\/homey.local/);
    assert.match(logs[1], /usb/);
  });

  it('prints a context as JSON and as human-readable JSON', (t) => {
    const { logs } = captureConsole(t);

    printContext(contextEntry(), { json: true });
    printContext(contextEntry(), {});

    assert.strictEqual(JSON.parse(logs[0]).homeyAuthentication.credentialId, '[REDACTED]');
    assert.strictEqual(JSON.parse(logs[1]).name, 'lab');
  });

  it('redacts authentication credentials and fills absent identity metadata', () => {
    assert.deepStrictEqual(toAuthenticationProfileOutput(profileEntry()), {
      name: 'work',
      accountId: 'account-1',
      email: 'developer@example.com',
      displayName: 'Homey Developer',
      credentialSource: {
        type: 'oauth',
        credentialId: '[REDACTED]',
        store: 'settings',
      },
      usable: true,
      reason: null,
      referencedBy: ['lab'],
    });
    assert.deepStrictEqual(
      toAuthenticationProfileOutput(
        profileEntry({
          profile: {},
          usable: false,
          reason: 'missing',
          referencedBy: [],
        }),
      ),
      {
        name: 'work',
        accountId: null,
        email: null,
        displayName: null,
        credentialSource: null,
        usable: false,
        reason: 'missing',
        referencedBy: [],
      },
    );
  });

  it('prints authentication profiles as JSON and human tables', (t) => {
    const { logs } = captureConsole(t);
    const entries = [
      profileEntry(),
      profileEntry({
        name: 'empty',
        profile: {},
        usable: false,
        reason: 'missing',
        referencedBy: [],
      }),
    ];

    printAuthenticationProfiles(entries, { json: true });
    printAuthenticationProfiles(entries, {});
    printAuthenticationProfile(entries[0], { json: true });
    printAuthenticationProfile(entries[0], {});

    assert.strictEqual(JSON.parse(logs[0]).length, 2);
    assert.match(logs[1], /developer@example.com/);
    assert.strictEqual(JSON.parse(logs[2]).credentialSource.credentialId, '[REDACTED]');
    assert.strictEqual(JSON.parse(logs[3]).name, 'work');
  });
});
