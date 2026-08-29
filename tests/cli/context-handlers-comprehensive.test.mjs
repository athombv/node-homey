import assert from 'node:assert';
import { describe, it } from 'node:test';

import inquirer from 'inquirer';

import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';
import { CliState } from '../../services/CliState.mjs';
import * as contextCommand from '../../bin/cmds/context.mjs';
import * as createCommand from '../../bin/cmds/context/create.mjs';
import * as diagnoseCommand from '../../bin/cmds/context/diagnose.mjs';
import * as inspectCommand from '../../bin/cmds/context/inspect.mjs';
import * as listCommand from '../../bin/cmds/context/ls.mjs';
import * as renameCommand from '../../bin/cmds/context/rename.mjs';
import * as removeCommand from '../../bin/cmds/context/rm.mjs';
import * as showCommand from '../../bin/cmds/context/show.mjs';
import * as updateCommand from '../../bin/cmds/context/update.mjs';
import * as useCommand from '../../bin/cmds/context/use.mjs';

function createBuilder() {
  const calls = [];
  const builder = new Proxy(
    {},
    {
      get(_target, method) {
        return (...args) => {
          calls.push([method, ...args]);
          return builder;
        };
      },
    },
  );
  return { builder, calls };
}

function captureProcess(t) {
  const exits = [];
  const logs = [];
  const errors = [];
  t.mock.method(process, 'exit', (code) => exits.push(code));
  t.mock.method(console, 'log', (...values) => logs.push(values.join(' ')));
  t.mock.method(console, 'error', (...values) => errors.push(values.join(' ')));
  return { exits, logs, errors };
}

function contextEntry(overrides = {}) {
  return {
    name: 'lab',
    current: false,
    context: {
      target: { homeyId: 'homey-1', name: 'Lab Homey', platform: 'local' },
      authenticationProfile: 'work',
      route: { type: 'discovery', strategies: ['cloud'] },
    },
    health: { status: 'ready', reasons: [] },
    ...overrides,
  };
}

function mockInteractiveStdin(t) {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
  t.after(() => {
    if (descriptor) Object.defineProperty(process.stdin, 'isTTY', descriptor);
    else delete process.stdin.isTTY;
  });
}

function mockStandardInput(t, chunks) {
  t.mock.method(process.stdin, Symbol.asyncIterator, async function* iterator() {
    for (const chunk of chunks) yield chunk;
  });
}

describe('context command builders', () => {
  it('registers every context command option and conflict', () => {
    for (const commandModule of [
      contextCommand,
      createCommand,
      diagnoseCommand,
      inspectCommand,
      listCommand,
      renameCommand,
      removeCommand,
      showCommand,
      updateCommand,
      useCommand,
    ]) {
      const { builder, calls } = createBuilder();
      assert.strictEqual(commandModule.builder(builder), builder);
      assert.ok(calls.length > 0);
    }
  });
});

describe('context create handler', () => {
  it('builds USB, address, discovery, and default routes', async (t) => {
    const { exits } = captureProcess(t);
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');
    const calls = [];
    t.mock.method(CliState, 'createContext', async (name, context, options) => {
      calls.push({ name, context, options });
      return contextEntry({ name, context });
    });

    await createCommand.handler({
      name: 'usb',
      homeyId: 'homey-1',
      authProfile: 'work',
      usb: true,
      json: true,
    });
    await createCommand.handler({
      name: 'address',
      tokenEnv: 'HOMEY_TOKEN',
      address: 'http://homey.local',
      json: true,
    });
    await createCommand.handler({
      name: 'discovery',
      homeyId: 'homey-1',
      strategy: ['local', 'cloud'],
      json: true,
    });
    await createCommand.handler({ name: 'default', homeyId: 'homey-1', json: true });

    assert.deepStrictEqual(
      calls.map((call) => call.context.route),
      [
        { type: 'usb' },
        { type: 'address', address: 'http://homey.local' },
        { type: 'discovery', strategies: ['local', 'cloud'] },
        undefined,
      ],
    );
    assert.strictEqual(calls[1].context.authenticationProfile, null);
    assert.strictEqual(calls[1].context.homeyAuthentication.variable, 'HOMEY_TOKEN');
    assert.strictEqual(calls[2].context.authenticationProfile, 'default');
    assert.deepStrictEqual(exits, [0, 0, 0, 0]);
  });

  it('reads and stores a token from standard input', async (t) => {
    const { exits } = captureProcess(t);
    mockStandardInput(t, [' secret', '-token\n']);
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'keychain');
    const createContext = t.mock.method(CliState, 'createContext', async (name, context) =>
      contextEntry({ name, context }),
    );

    await createCommand.handler({
      name: 'direct',
      tokenStdin: true,
      address: 'http://homey.local',
      json: true,
    });

    assert.deepStrictEqual(createContext.mock.calls[0].arguments[2], {
      directToken: 'secret-token',
      store: 'keychain',
      use: undefined,
    });
    assert.deepStrictEqual(exits, [0]);
  });

  it('prompts for inferred token, missing Homey ID, and missing direct address', async (t) => {
    mockInteractiveStdin(t);
    const { exits } = captureProcess(t);
    const answers = [
      { token: 'prompt-token' },
      { homeyId: 'prompt-homey' },
      { address: 'http://prompt.local' },
    ];
    t.mock.method(inquirer, 'createPromptModule', () => async () => answers.shift());
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');
    const calls = [];
    t.mock.method(CliState, 'createContext', async (name, context, options) => {
      calls.push({ name, context, options });
      return contextEntry({ name, context });
    });

    await createCommand.handler({ name: 'inferred', address: 'http://homey.local', json: true });
    await createCommand.handler({ name: 'account', authProfile: 'work', json: true });
    await createCommand.handler({ name: 'direct', tokenEnv: 'HOMEY_TOKEN', json: true });

    assert.strictEqual(calls[0].options.directToken, 'prompt-token');
    assert.strictEqual(calls[1].context.target.homeyId, 'prompt-homey');
    assert.strictEqual(calls[2].context.route.address, 'http://prompt.local');
    assert.deepStrictEqual(exits, [0, 0, 0]);
  });

  it('reports prompt and create failures', async (t) => {
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');

    await createCommand.handler({ name: 'noninteractive', tokenPrompt: true, json: true });
    assert.match(JSON.parse(errors[0]).error, /interactive terminal/);

    mockStandardInput(t, []);
    await createCommand.handler({ name: 'empty-stdin', tokenStdin: true, json: true });
    assert.match(JSON.parse(errors[1]).error, /No Homey token/);

    mockInteractiveStdin(t);
    t.mock.method(inquirer, 'createPromptModule', () => async () => ({ token: '' }));
    await createCommand.handler({ name: 'empty-prompt', tokenPrompt: true, json: true });
    assert.match(JSON.parse(errors[2]).error, /Homey token is required/);

    t.mock.method(CliState, 'createContext', async () => {
      throw new Error('create failed');
    });
    await createCommand.handler({ name: 'broken', homeyId: 'homey-1', json: true });

    assert.match(JSON.parse(errors[3]).error, /create failed/);
    assert.deepStrictEqual(exits, [1, 1, 1, 1]);
  });
});

describe('context update handler', () => {
  it('applies every metadata and authentication patch', async (t) => {
    const { exits } = captureProcess(t);
    const updates = [];
    t.mock.method(CliState, 'updateContext', async (name, updater, options) => {
      const context = {
        description: 'old',
        target: { homeyId: 'old-id', name: 'Old', platform: 'old' },
        authenticationProfile: 'old-profile',
        homeyAuthentication: { source: 'environment', variable: 'OLD_TOKEN' },
        route: { type: 'usb' },
      };
      const updated = updater(context);
      updates.push({ name, updated: structuredClone(updated), options });
      return contextEntry({ name, context: updated });
    });

    await updateCommand.handler({
      name: 'lab',
      description: 'new',
      unsetDescription: true,
      homeyId: 'new-id',
      homeyName: 'New',
      platform: 'local',
      unsetHomeyId: true,
      unsetMetadata: true,
      authProfile: 'work',
      unsetAuthProfile: true,
      tokenEnv: 'NEW_TOKEN',
      unsetHomeyAuth: true,
      strategy: ['local', 'cloud'],
      json: true,
    });

    assert.deepStrictEqual(updates[0].updated, {
      target: {},
      route: { type: 'discovery', strategies: ['local', 'cloud'] },
    });
    assert.deepStrictEqual(updates[0].options, {});
    assert.deepStrictEqual(exits, [0]);
  });

  it('applies USB, address, and default route patches', async (t) => {
    const { exits } = captureProcess(t);
    const routes = [];
    t.mock.method(CliState, 'updateContext', async (name, updater) => {
      const context = {
        target: { homeyId: 'homey-1' },
        authenticationProfile: 'work',
        route: { type: 'discovery', strategies: ['cloud'] },
      };
      updater(context);
      routes.push(context.route);
      return contextEntry({ name, context });
    });

    await updateCommand.handler({ name: 'usb', usb: true, json: true });
    await updateCommand.handler({ name: 'address', address: 'http://homey.local', json: true });
    await updateCommand.handler({ name: 'default', useDefaultRoute: true, json: true });
    await updateCommand.handler({ name: 'unset', unsetAddress: true, json: true });

    assert.deepStrictEqual(routes, [
      { type: 'usb' },
      { type: 'address', address: 'http://homey.local' },
      undefined,
      undefined,
    ]);
    assert.deepStrictEqual(exits, [0, 0, 0, 0]);
  });

  it('reads replacement tokens from stdin and uses the default store', async (t) => {
    const { exits } = captureProcess(t);
    mockStandardInput(t, ['new-token\n']);
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'keychain');
    const updateContext = t.mock.method(CliState, 'updateContext', async (name, updater) => {
      const context = {
        target: {},
        homeyAuthentication: { source: 'environment', variable: 'TOKEN' },
        route: { type: 'address', address: 'http://homey.local' },
      };
      updater(context);
      return contextEntry({ name, context });
    });

    await updateCommand.handler({ name: 'lab', tokenStdin: true, json: true });

    assert.deepStrictEqual(updateContext.mock.calls[0].arguments[2], {
      directToken: 'new-token',
      store: 'keychain',
    });
    assert.deepStrictEqual(exits, [0]);
  });

  it('refreshes metadata after an update', async (t) => {
    const { exits } = captureProcess(t);
    let updateCall = 0;
    t.mock.method(CliState, 'updateContext', async (name, updater) => {
      updateCall += 1;
      const context = {
        target: { homeyId: 'homey-1', name: 'Old', platform: 'old' },
        authenticationProfile: 'work',
        route: { type: 'discovery', strategies: ['cloud'] },
      };
      const updated = updater(context);
      return contextEntry({ name, context: updated });
    });
    t.mock.method(CliState, 'getContext', async () => contextEntry());
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({
      getHomey: async () => ({ name: 'Refreshed', platform: 'local' }),
    }));

    await updateCommand.handler({ name: 'lab', refresh: true, json: true });

    assert.strictEqual(updateCall, 2);
    assert.deepStrictEqual(exits, [0]);
  });

  it('rejects empty replacement tokens and reports update errors', async (t) => {
    const { exits, errors } = captureProcess(t);
    mockStandardInput(t, []);

    await updateCommand.handler({ name: 'lab', tokenStdin: true, json: true });
    assert.match(JSON.parse(errors[0]).error, /No Homey token/);

    t.mock.method(CliState, 'updateContext', async () => {
      throw new Error('update failed');
    });
    await updateCommand.handler({ name: 'lab', json: true });

    assert.match(JSON.parse(errors[1]).error, /update failed/);
    assert.deepStrictEqual(exits, [1, 1]);
  });
});

describe('remaining context handlers', () => {
  it('refreshes metadata before reporting diagnose failures', async (t) => {
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getContext', async () => contextEntry());
    t.mock.method(AuthenticationProfiles, 'getClient', async () => ({
      getHomey: async () => ({ name: 'Refreshed', platform: 'local' }),
    }));
    const updateContext = t.mock.method(CliState, 'updateContext', async (name, updater) => {
      const context = contextEntry().context;
      updater(context);
      return contextEntry({ name, context });
    });
    t.mock.method(CliState, 'resolveContextSelection', async () => {
      throw new Error('diagnose stopped');
    });

    await diagnoseCommand.handler({ name: 'lab', refresh: true, json: true });

    assert.strictEqual(updateContext.mock.callCount(), 1);
    assert.match(JSON.parse(errors[0]).error, /diagnose stopped/);
    assert.deepStrictEqual(exits, [1]);
  });

  it('lists, inspects, renames, selects, and shows contexts', async (t) => {
    const { exits, logs, errors } = captureProcess(t);
    const ready = contextEntry();
    const degraded = contextEntry({
      health: { status: 'degraded', reasons: ['missing direct token'] },
    });
    t.mock.method(CliState, 'listContexts', async () => [ready]);
    const getContext = t.mock.method(CliState, 'getContext', async () => ready);
    t.mock.method(CliState, 'renameContext', async () => contextEntry({ name: 'office' }));
    const useContext = t.mock.method(CliState, 'useContext', async () => degraded);
    const resolveSelection = t.mock.method(CliState, 'resolveContextSelection', async () => ({
      name: 'lab',
      source: 'current',
    }));

    await listCommand.handler({ json: true });
    await inspectCommand.handler({ name: 'lab', json: true });
    await renameCommand.handler({ from: 'lab', to: 'office', json: true });
    await useCommand.handler({ name: 'lab', json: true });
    await showCommand.handler({ json: true });
    await showCommand.handler({});
    resolveSelection.mock.mockImplementation(async () => null);
    await showCommand.handler({});
    useContext.mock.mockImplementation(async () => ready);
    await useCommand.handler({ name: 'lab', json: true });
    getContext.mock.mockImplementation(async () => null);
    await inspectCommand.handler({ name: 'missing', json: true });

    assert.strictEqual(JSON.parse(logs[0]).length, 1);
    assert.match(errors[0], /context lab is degraded/);
    assert.match(logs[5], /Current context: lab \(current\)/);
    assert.match(logs[6], /No current context/);
    assert.match(JSON.parse(errors[1]).error, /does not exist/);
    assert.deepStrictEqual(exits, [0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it('reports list, rename, use, and show failures', async (t) => {
    const { exits, errors } = captureProcess(t);
    const fail = async () => {
      throw new Error('operation failed');
    };
    t.mock.method(CliState, 'listContexts', fail);
    t.mock.method(CliState, 'renameContext', fail);
    t.mock.method(CliState, 'useContext', fail);
    t.mock.method(CliState, 'resolveContextSelection', fail);

    await listCommand.handler({ json: true });
    await renameCommand.handler({ from: 'lab', to: 'office', json: true });
    await useCommand.handler({ name: 'lab', json: true });
    await showCommand.handler({ json: true });

    assert.strictEqual(errors.length, 4);
    assert.deepStrictEqual(exits, [1, 1, 1, 1]);
  });

  it('removes non-current and explicitly confirmed current contexts', async (t) => {
    const { exits, logs } = captureProcess(t);
    const entries = [contextEntry(), contextEntry({ current: true })];
    t.mock.method(CliState, 'getContext', async () => entries.shift());
    const removeContext = t.mock.method(CliState, 'removeContext', async () => {});

    await removeCommand.handler({ name: 'lab' });
    await removeCommand.handler({ name: 'lab', yes: true, json: true });

    assert.strictEqual(removeContext.mock.callCount(), 2);
    assert.match(logs[0], /Removed context lab/);
    assert.deepStrictEqual(exits, [0, 0]);
  });

  it('requires confirmation for current context removal and supports interactive answers', async (t) => {
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getContext', async () => contextEntry({ current: true }));
    const removeContext = t.mock.method(CliState, 'removeContext', async () => {});

    await removeCommand.handler({ name: 'lab', json: true });
    assert.match(JSON.parse(errors[0]).error, /re-run with --yes/);

    mockInteractiveStdin(t);
    const answers = [{ confirmed: true }, { confirmed: false }];
    t.mock.method(inquirer, 'createPromptModule', () => async () => answers.shift());
    await removeCommand.handler({ name: 'lab', json: true });
    await removeCommand.handler({ name: 'lab', json: true });

    assert.strictEqual(removeContext.mock.callCount(), 1);
    assert.match(JSON.parse(errors[1]).error, /cancelled/);
    assert.deepStrictEqual(exits, [1, 0, 1]);
  });
});
