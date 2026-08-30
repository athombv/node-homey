import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';
import { CliState } from '../../services/CliState.mjs';
import AthomApi from '../../lib/AthomApi.js';
import {
  resolveCommandContext,
  resolveEffectiveContext,
} from '../../lib/EffectiveContextResolver.mjs';

function selection(overrides = {}) {
  return {
    name: 'lab',
    source: 'current',
    context: {
      target: { homeyId: 'homey-1', name: 'Lab Homey', platform: 'local' },
      authenticationProfile: 'work',
      route: { type: 'discovery', strategies: ['cloud'] },
    },
    health: { status: 'ready', reasons: [] },
    state: {
      authenticationProfiles: {
        profiles: {
          work: {
            credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' },
          },
        },
      },
    },
    ...overrides,
  };
}

function mockSelection(t, selected, token = null) {
  const resolveContextSelection = t.mock.method(CliState, 'resolveContextSelection', async () => {
    return selected;
  });
  const resolveDirectToken = t.mock.method(CliState, 'resolveDirectToken', async () => token);

  return { resolveContextSelection, resolveDirectToken };
}

function mockInteractiveStdin(t) {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: true,
  });
  t.after(() => {
    if (descriptor) {
      Object.defineProperty(process.stdin, 'isTTY', descriptor);
    } else {
      delete process.stdin.isTTY;
    }
  });
}

describe('EffectiveContextResolver', () => {
  it('resolves account authentication and returns an immutable context snapshot', async (t) => {
    const selected = selection();
    const accountClient = { id: 'client' };
    mockSelection(t, selected);
    t.mock.method(AuthenticationProfiles, 'getClient', async (name, options) => {
      assert.strictEqual(name, 'work');
      assert.strictEqual(options.allowInteractiveLogin, process.stdin.isTTY);
      return accountClient;
    });

    const result = await resolveEffectiveContext({ auth: 'auto' });
    selected.context.target.name = 'Mutated';

    assert.strictEqual(result.accountClient, accountClient);
    assert.deepStrictEqual(result.effectiveContext, {
      name: 'lab',
      selectionSource: 'current',
      target: { homeyId: 'homey-1', name: 'Lab Homey', platform: 'local' },
      authentication: { mode: 'account', profile: 'work', token: null },
      route: { type: 'discovery', strategies: ['cloud'] },
      health: { status: 'ready', reasons: [] },
    });
  });

  it('prefers direct authentication and only loads an account client when lookup needs it', async (t) => {
    const selected = selection({
      context: {
        target: { homeyId: 'homey-1' },
        authenticationProfile: 'work',
        homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
        route: { type: 'discovery', strategies: ['local'] },
      },
    });
    const accountClient = { id: 'client' };
    mockSelection(t, selected, 'direct-token');
    const getClient = t.mock.method(AuthenticationProfiles, 'getClient', async () => accountClient);

    const result = await resolveEffectiveContext({ auth: 'auto' });

    assert.strictEqual(result.effectiveContext.authentication.mode, 'homey');
    assert.strictEqual(result.effectiveContext.authentication.profile, null);
    assert.strictEqual(result.effectiveContext.authentication.token, 'direct-token');
    assert.strictEqual(result.accountClient, accountClient);
    assert.strictEqual(getClient.mock.callCount(), 1);
  });

  it('does not load an account client for address-based direct authentication', async (t) => {
    const selected = selection({
      context: {
        target: {},
        authenticationProfile: 'work',
        homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
        route: { type: 'address', address: 'http://127.0.0.1:1234' },
      },
    });
    mockSelection(t, selected, 'direct-token');
    const getClient = t.mock.method(AuthenticationProfiles, 'getClient', async () => ({
      id: 'client',
    }));

    const result = await resolveEffectiveContext({ auth: 'homey' });

    assert.strictEqual(result.accountClient, null);
    assert.strictEqual(result.effectiveContext.route.address, 'http://127.0.0.1:1234');
    assert.strictEqual(getClient.mock.callCount(), 0);
  });

  it('supports explicit Homey ID and token overlays without inheriting an address', async (t) => {
    const selected = selection({
      context: {
        target: { homeyId: 'context-homey', name: 'Context Homey', platform: 'local' },
        authenticationProfile: 'work',
        route: { type: 'address', address: 'http://context.local' },
      },
    });
    mockSelection(t, selected);
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveEffectiveContext({
      token: 'explicit-token',
      homeyId: 'explicit-homey',
    });

    assert.strictEqual(result.effectiveContext.target.homeyId, 'explicit-homey');
    assert.strictEqual(result.effectiveContext.target.name, 'Context Homey');
    assert.strictEqual(result.effectiveContext.route, null);
  });

  it('treats explicit token and address as a pairwise identity replacement', async (t) => {
    mockSelection(t, selection());

    const result = await resolveEffectiveContext({
      token: 'explicit-token',
      address: 'http://explicit.local',
    });

    assert.deepStrictEqual(result.effectiveContext.target, {
      homeyId: null,
      name: null,
      platform: null,
    });
    assert.deepStrictEqual(result.effectiveContext.route, {
      type: 'address',
      address: 'http://explicit.local',
    });
    assert.strictEqual(result.accountClient, null);
  });

  it('uses an explicit token instead of stale direct-authentication health', async (t) => {
    const selected = selection({
      health: {
        status: 'degraded',
        capabilities: { account: true, homey: false },
        reasons: ['Direct Homey authentication: stored credentials are missing.'],
      },
    });
    mockSelection(t, selected);

    const result = await resolveEffectiveContext({
      token: 'explicit-token',
      address: 'http://explicit.local',
    });

    assert.strictEqual(result.effectiveContext.authentication.mode, 'homey');
    assert.deepStrictEqual(result.effectiveContext.health, {
      status: 'ready',
      capabilities: { account: true, homey: true },
      reasons: [],
    });
  });

  it('preserves an unusable route when an explicit token does not replace it', async (t) => {
    const selected = selection({
      health: {
        status: 'unusable',
        capabilities: { account: true, homey: false },
        reasons: [
          'Direct Homey authentication: stored credentials are missing.',
          'Connection route: Homey Cloud targets require cloud discovery; local cannot reach this target.',
        ],
      },
    });
    mockSelection(t, selected);
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveEffectiveContext({
      token: 'explicit-token',
      homeyId: 'explicit-homey',
    });

    assert.deepStrictEqual(result.effectiveContext.health, {
      status: 'unusable',
      capabilities: { account: true, homey: true },
      reasons: [
        'Connection route: Homey Cloud targets require cloud discovery; local cannot reach this target.',
      ],
    });
  });

  it('supports an explicit direct target when no persisted health exists', async (t) => {
    mockSelection(t, null);

    const result = await resolveEffectiveContext({
      token: 'explicit-token',
      address: 'http://explicit.local',
    });

    assert.strictEqual(result.effectiveContext.health, null);
  });

  it('validates explicit token and address combinations', async (t) => {
    const selections = [
      selection({
        context: {
          target: {},
          authenticationProfile: 'work',
          route: { type: 'discovery', strategies: ['cloud'] },
        },
      }),
      selection(),
      selection(),
    ];
    t.mock.method(CliState, 'resolveContextSelection', async () => selections.shift());
    t.mock.method(CliState, 'resolveDirectToken', async () => null);

    await assert.rejects(
      () => resolveEffectiveContext({ token: 'token' }),
      /--address or --homey-id/,
    );
    await assert.rejects(
      () =>
        resolveEffectiveContext({
          token: 'token',
          address: 'http://homey.local',
          homeyId: 'homey-2',
        }),
      /--address and --homey-id cannot be used together/,
    );
    await assert.rejects(
      () => resolveEffectiveContext({ address: 'http://homey.local' }),
      /--address can only be used together with --token/,
    );
  });

  it('validates requested authentication capabilities', async (t) => {
    const directOnly = selection({
      context: {
        target: {},
        homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
        route: { type: 'address', address: 'http://homey.local' },
      },
    });
    mockSelection(t, directOnly, 'direct-token');

    await assert.rejects(
      () => resolveEffectiveContext({ auth: 'account' }),
      /no account authentication profile/,
    );
    await assert.rejects(
      () => resolveEffectiveContext({ auth: 'homey' }, { scope: 'account' }),
      /Account-scoped operations cannot use direct Homey authentication/,
    );
    await assert.rejects(
      () => resolveEffectiveContext({}, { scope: 'account' }),
      /no account authentication profile/,
    );
  });

  it('rejects unusable requested capabilities before creating an account client', async (t) => {
    const selections = [
      selection({
        context: {
          target: { homeyId: 'homey-1' },
          authenticationProfile: 'work',
          homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
          route: { type: 'discovery', strategies: ['cloud'] },
        },
        health: {
          status: 'degraded',
          capabilities: { account: false, homey: true },
          reasons: ['Account authentication: stored credentials are missing.'],
        },
      }),
      selection({
        context: {
          target: { homeyId: 'homey-1' },
          authenticationProfile: 'work',
          homeyAuthentication: { source: 'stored', credentialId: 'broken', store: 'settings' },
          route: { type: 'discovery', strategies: ['cloud'] },
        },
        health: {
          status: 'degraded',
          capabilities: { account: true, homey: false },
          reasons: ['Direct Homey authentication: stored credentials are missing.'],
        },
      }),
    ];
    const tokens = ['direct-token', 'wrong-kind-token'];
    t.mock.method(CliState, 'resolveContextSelection', async () => {
      return selections.shift();
    });
    t.mock.method(CliState, 'resolveDirectToken', async () => {
      return tokens.shift();
    });
    const getClient = t.mock.method(AuthenticationProfiles, 'getClient', async () => ({
      id: 'client',
    }));

    await assert.rejects(
      () => resolveEffectiveContext({}, { scope: 'account' }),
      /no usable account authentication.*stored credentials are missing/,
    );
    await assert.rejects(
      () => resolveEffectiveContext({ auth: 'homey' }),
      /no usable direct Homey authentication.*stored credentials are missing/,
    );
    assert.strictEqual(getClient.mock.callCount(), 0);
  });

  it('rejects missing direct credentials and missing Homey targets', async (t) => {
    mockSelection(
      t,
      selection({
        context: {
          target: { homeyId: 'homey-1' },
          authenticationProfile: 'work',
          route: { type: 'discovery', strategies: ['cloud'] },
        },
      }),
    );

    await assert.rejects(
      () => resolveEffectiveContext({ auth: 'homey' }),
      /no usable direct Homey authentication/,
    );

    t.mock.restoreAll();
    mockSelection(
      t,
      selection({
        context: {
          target: {},
          authenticationProfile: 'work',
          route: { type: 'discovery', strategies: ['cloud'] },
        },
      }),
    );
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));
    await assert.rejects(
      () => resolveEffectiveContext({ auth: 'account' }),
      /No active Homey selected/,
    );
  });

  it('uses the default profile for explicit targets without a selected context', async (t) => {
    mockSelection(t, null);
    const accountClient = { id: 'default-client' };
    t.mock.method(AuthenticationProfiles, 'getClient', async (name) => {
      assert.strictEqual(name, 'default');
      return accountClient;
    });

    const result = await resolveEffectiveContext({ homeyId: 'explicit-homey' });

    assert.strictEqual(result.accountClient, accountClient);
    assert.strictEqual(result.effectiveContext.name, null);
    assert.strictEqual(result.effectiveContext.selectionSource, null);
    assert.strictEqual(result.effectiveContext.health, null);
  });

  it('rejects auto authentication when a context has no authentication capability', async (t) => {
    mockSelection(
      t,
      selection({
        context: {
          target: {},
          route: { type: 'address', address: 'http://homey.local' },
        },
      }),
    );

    await assert.rejects(() => resolveEffectiveContext({}), /no usable Homey authentication/);
  });

  it('recovers a broken current context interactively and retains the recovered snapshot', async (t) => {
    mockInteractiveStdin(t);
    const currentError = Object.assign(new Error('broken current'), {
      selectionSource: 'current',
    });
    let resolutionAttempt = 0;
    const resolveContextSelection = t.mock.method(CliState, 'resolveContextSelection', async () => {
      resolutionAttempt += 1;
      if (resolutionAttempt === 1) throw currentError;
      return selection();
    });
    t.mock.method(CliState, 'resolveDirectToken', async () => null);
    const selectActiveHomey = t.mock.method(
      AthomApi.prototype,
      'selectActiveHomey',
      async () => {},
    );
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveEffectiveContext({ auth: 'account' });

    assert.strictEqual(result.effectiveContext.name, 'lab');
    assert.strictEqual(resolveContextSelection.mock.callCount(), 2);
    assert.strictEqual(selectActiveHomey.mock.callCount(), 1);
  });

  it('does not recover non-current or non-interactive selection errors', async (t) => {
    const selectionError = Object.assign(new Error('broken argument'), {
      selectionSource: 'argument',
    });
    t.mock.method(CliState, 'resolveContextSelection', async () => {
      throw selectionError;
    });

    await assert.rejects(() => resolveEffectiveContext({ context: 'broken' }), selectionError);
  });

  it('prompts for a legacy Homey when an interactive Homey command has no selection', async (t) => {
    mockInteractiveStdin(t);
    const selections = [null, selection()];
    const resolveContextSelection = t.mock.method(CliState, 'resolveContextSelection', async () => {
      return selections.shift();
    });
    t.mock.method(CliState, 'resolveDirectToken', async () => null);
    const selectActiveHomey = t.mock.method(
      AthomApi.prototype,
      'selectActiveHomey',
      async () => {},
    );
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveEffectiveContext({ auth: 'account' });

    assert.strictEqual(result.effectiveContext.name, 'lab');
    assert.strictEqual(resolveContextSelection.mock.callCount(), 2);
    assert.strictEqual(selectActiveHomey.mock.callCount(), 1);
  });
});

describe('resolveCommandContext', () => {
  it('keeps legacy auth:auto on the legacy path', async (t) => {
    const selected = selection({
      name: 'default',
      context: {
        target: { homeyId: 'legacy-homey' },
        authenticationProfile: 'default',
        route: { type: 'discovery', strategies: ['cloud'] },
      },
      state: {
        authenticationProfiles: {
          profiles: {
            default: { credentialSource: { type: 'oauth', legacy: true } },
          },
        },
      },
    });
    const { resolveContextSelection, resolveDirectToken } = mockSelection(t, selected);

    const result = await resolveCommandContext({ auth: 'auto' });

    assert.deepStrictEqual(result, {
      usesContextResolution: false,
      effectiveContext: null,
      accountClient: null,
    });
    assert.strictEqual(resolveContextSelection.mock.callCount(), 1);
    assert.strictEqual(resolveDirectToken.mock.callCount(), 0);
  });

  it('uses named current contexts and resolves their selection once', async (t) => {
    const { resolveContextSelection } = mockSelection(t, selection());
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveCommandContext({ auth: 'auto' });

    assert.strictEqual(result.usesContextResolution, true);
    assert.strictEqual(result.effectiveContext.name, 'lab');
    assert.strictEqual(resolveContextSelection.mock.callCount(), 1);
  });

  it('uses explicit selectors, environment selectors, and non-auto auth modes', async (t) => {
    const originalContext = process.env.HOMEY_CONTEXT;
    t.after(() => {
      if (originalContext === undefined) delete process.env.HOMEY_CONTEXT;
      else process.env.HOMEY_CONTEXT = originalContext;
    });
    mockSelection(t, selection());
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    assert.strictEqual(
      (await resolveCommandContext({ context: 'lab', auth: 'auto' })).usesContextResolution,
      true,
    );
    process.env.HOMEY_CONTEXT = 'lab';
    assert.strictEqual((await resolveCommandContext({ auth: 'auto' })).usesContextResolution, true);
    delete process.env.HOMEY_CONTEXT;
    assert.strictEqual(
      (await resolveCommandContext({ homeyId: 'homey-1', auth: 'account' })).usesContextResolution,
      true,
    );
  });

  it('does not opt commands into context resolution when auth is omitted', async (t) => {
    mockSelection(t, selection());

    const result = await resolveCommandContext({});

    assert.strictEqual(result.usesContextResolution, false);
  });

  it('keeps auth:auto on the legacy path when there is no selection', async (t) => {
    mockSelection(t, null);

    const result = await resolveCommandContext({ auth: 'auto' });

    assert.strictEqual(result.usesContextResolution, false);
  });

  it('can override the authentication mode supplied by argv', async (t) => {
    mockSelection(
      t,
      selection({
        context: {
          target: { homeyId: 'homey-1' },
          authenticationProfile: 'work',
          homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
          route: { type: 'discovery', strategies: ['cloud'] },
        },
      }),
      'direct-token',
    );
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({ id: 'client' }));

    const result = await resolveCommandContext(
      { context: 'lab', auth: 'auto' },
      { authenticationMode: 'account' },
    );

    assert.strictEqual(result.effectiveContext.authentication.mode, 'account');
  });
});
