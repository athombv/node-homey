import assert from 'node:assert';
import { describe, it } from 'node:test';

import inquirer from 'inquirer';

import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';
import { CliState } from '../../services/CliState.mjs';
import * as authCommand from '../../bin/cmds/auth.mjs';
import * as inspectCommand from '../../bin/cmds/auth/inspect.mjs';
import * as loginCommand from '../../bin/cmds/auth/login.mjs';
import * as logoutCommand from '../../bin/cmds/auth/logout.mjs';
import * as listCommand from '../../bin/cmds/auth/ls.mjs';
import * as migrateCommand from '../../bin/cmds/auth/migrate.mjs';
import * as removeCommand from '../../bin/cmds/auth/remove.mjs';
import * as renameCommand from '../../bin/cmds/auth/rename.mjs';
import * as storageCommand from '../../bin/cmds/auth/storage.mjs';

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

function authenticationProfile(overrides = {}) {
  return {
    name: 'work',
    profile: {
      accountId: 'account-1',
      email: 'developer@example.com',
      credentialSource: { type: 'oauth', credentialId: 'id', store: 'settings' },
    },
    usable: true,
    reason: null,
    referencedBy: [],
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

describe('auth command builders', () => {
  it('registers all auth command options', () => {
    for (const commandModule of [
      authCommand,
      inspectCommand,
      loginCommand,
      logoutCommand,
      listCommand,
      migrateCommand,
      removeCommand,
      renameCommand,
      storageCommand,
    ]) {
      const { builder, calls } = createBuilder();
      assert.strictEqual(commandModule.builder(builder), builder);
      assert.ok(calls.length > 0);
    }
  });
});

describe('auth command handlers', () => {
  it('inspects existing profiles and reports missing profiles', async (t) => {
    const { exits, logs, errors } = captureProcess(t);
    const getProfile = t.mock.method(CliState, 'getAuthenticationProfile', async () =>
      authenticationProfile(),
    );

    await inspectCommand.handler({ profile: 'work', json: true });
    getProfile.mock.mockImplementation(async () => null);
    await inspectCommand.handler({ profile: 'missing', json: true });

    assert.strictEqual(JSON.parse(logs[0]).name, 'work');
    assert.match(JSON.parse(errors[0]).error, /does not exist/);
    assert.deepStrictEqual(exits, [0, 1]);
  });

  it('logs in with PAT and OAuth profiles while honoring existing and default stores', async (t) => {
    const { exits, logs } = captureProcess(t);
    const existingProfiles = [authenticationProfile(), null, null];
    t.mock.method(CliState, 'getAuthenticationProfile', async () => existingProfiles.shift());
    const getDefaultStore = t.mock.method(
      CliState,
      'getDefaultCredentialStore',
      async () => 'keychain',
    );
    const loginWithPat = t.mock.method(AuthenticationProfiles, 'loginWithPat', async () => ({
      id: 'account-1',
      email: 'developer@example.com',
      firstname: 'Homey',
      lastname: 'Developer',
    }));
    const loginWithOAuth = t.mock.method(
      AuthenticationProfiles,
      'loginWithOAuth',
      async () => ({}),
    );

    await loginCommand.handler({
      profile: 'work',
      patEnv: 'WORK_PAT',
      json: true,
      replaceAccount: true,
    });
    await loginCommand.handler({ profile: 'new', json: true, replaceAccount: false });
    await loginCommand.handler({ profile: 'explicit', store: 'settings', replaceAccount: false });

    assert.strictEqual(loginWithPat.mock.callCount(), 1);
    assert.deepStrictEqual(loginWithOAuth.mock.calls[0].arguments[1], {
      store: 'keychain',
      replaceAccount: false,
    });
    assert.deepStrictEqual(loginWithOAuth.mock.calls[1].arguments[1], {
      store: 'settings',
      replaceAccount: false,
    });
    assert.strictEqual(getDefaultStore.mock.callCount(), 1);
    assert.strictEqual(JSON.parse(logs[0]).email, 'developer@example.com');
    assert.match(logs[2], /is logged in\./);
    assert.deepStrictEqual(exits, [0, 0, 0]);
  });

  it('reports login errors', async (t) => {
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getAuthenticationProfile', async () => null);
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');
    t.mock.method(AuthenticationProfiles, 'loginWithOAuth', async () => {
      throw new Error('login failed');
    });

    await loginCommand.handler({ profile: 'work', json: true });

    assert.deepStrictEqual(exits, [1]);
    assert.match(JSON.parse(errors[0]).error, /login failed/);
  });

  it('logs out, lists, migrates, renames, and configures storage', async (t) => {
    const { exits, logs } = captureProcess(t);
    t.mock.method(AuthenticationProfiles, 'logout', async () => {});
    t.mock.method(CliState, 'listAuthenticationProfiles', async () => [authenticationProfile()]);
    t.mock.method(AuthenticationProfiles, 'migrateAuthenticationProfile', async () => ({
      profile: authenticationProfile(),
      identityError: null,
    }));
    t.mock.method(CliState, 'renameAuthenticationProfile', async () =>
      authenticationProfile({ name: 'office' }),
    );
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');
    t.mock.method(CliState, 'setDefaultCredentialStore', async (backend) => backend);

    await logoutCommand.handler({ profile: 'work' });
    await listCommand.handler({ json: true });
    await migrateCommand.handler({ profile: 'work', to: 'keychain', json: true });
    await renameCommand.handler({ from: 'work', to: 'office', json: true });
    await storageCommand.handler({ json: true });
    await storageCommand.handler({ backend: 'keychain', json: true });

    assert.match(logs[0], /Logged out authentication profile work/);
    assert.strictEqual(JSON.parse(logs[1]).length, 1);
    assert.strictEqual(JSON.parse(logs[4]).defaultStore, 'settings');
    assert.strictEqual(JSON.parse(logs[5]).defaultStore, 'keychain');
    assert.deepStrictEqual(exits, [0, 0, 0, 0, 0, 0]);
  });

  it('reports errors from logout, list, migrate, rename, and storage handlers', async (t) => {
    const { exits, errors } = captureProcess(t);
    const fail = async () => {
      throw new Error('operation failed');
    };
    t.mock.method(AuthenticationProfiles, 'logout', fail);
    t.mock.method(CliState, 'listAuthenticationProfiles', fail);
    t.mock.method(AuthenticationProfiles, 'migrateAuthenticationProfile', fail);
    t.mock.method(CliState, 'renameAuthenticationProfile', fail);
    t.mock.method(CliState, 'getDefaultCredentialStore', fail);

    await logoutCommand.handler({ profile: 'work', json: true });
    await listCommand.handler({ json: true });
    await migrateCommand.handler({ profile: 'work', to: 'settings', json: true });
    await renameCommand.handler({ from: 'work', to: 'office', json: true });
    await storageCommand.handler({ json: true });

    assert.deepStrictEqual(exits, [1, 1, 1, 1, 1]);
    assert.strictEqual(errors.length, 5);
  });

  it('removes unreferenced profiles and permits confirmed dependant removal', async (t) => {
    const { exits, logs } = captureProcess(t);
    const entries = [authenticationProfile(), authenticationProfile({ referencedBy: ['lab'] })];
    t.mock.method(CliState, 'getAuthenticationProfile', async () => entries.shift());
    const removeProfile = t.mock.method(CliState, 'removeAuthenticationProfile', async () => {});

    await removeCommand.handler({ profile: 'work', json: true });
    await removeCommand.handler({ profile: 'work', yes: true, json: true });

    assert.strictEqual(removeProfile.mock.callCount(), 2);
    assert.deepStrictEqual(JSON.parse(logs[1]).affectedContexts, ['lab']);
    assert.deepStrictEqual(exits, [0, 0]);
  });

  it('handles interactive dependant-removal confirmation and cancellation', async (t) => {
    mockInteractiveStdin(t);
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getAuthenticationProfile', async () =>
      authenticationProfile({
        referencedBy: ['lab', 'office'],
      }),
    );
    const answers = [{ confirmed: true }, { confirmed: false }];
    t.mock.method(inquirer, 'createPromptModule', () => async () => answers.shift());
    const removeProfile = t.mock.method(CliState, 'removeAuthenticationProfile', async () => {});

    await removeCommand.handler({ profile: 'work', json: true });
    await removeCommand.handler({ profile: 'work', json: true });

    assert.strictEqual(removeProfile.mock.callCount(), 1);
    assert.match(JSON.parse(errors[0]).error, /cancelled/);
    assert.deepStrictEqual(exits, [0, 1]);
  });

  it('reports missing profile removal', async (t) => {
    const { exits, errors } = captureProcess(t);
    t.mock.method(CliState, 'getAuthenticationProfile', async () => null);

    await removeCommand.handler({ profile: 'missing', json: true });

    assert.deepStrictEqual(exits, [1]);
    assert.match(JSON.parse(errors[0]).error, /does not exist/);
  });

  it('requires --yes for dependant removal without a TTY and covers human output', async (t) => {
    const { exits, logs, errors } = captureProcess(t);
    const entries = [authenticationProfile({ referencedBy: ['lab'] }), authenticationProfile()];
    t.mock.method(CliState, 'getAuthenticationProfile', async () => entries.shift());
    t.mock.method(CliState, 'removeAuthenticationProfile', async () => {});
    t.mock.method(CliState, 'getDefaultCredentialStore', async () => 'settings');

    await removeCommand.handler({ profile: 'work' });
    await removeCommand.handler({ profile: 'work' });
    await storageCommand.handler({});

    assert.match(errors[0], /Re-run with --yes/);
    assert.match(logs[0], /Removed authentication profile work/);
    assert.match(logs[1], /Default credential store: settings/);
    assert.deepStrictEqual(exits, [1, 0, 0]);
  });
});
