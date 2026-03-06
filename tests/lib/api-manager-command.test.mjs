import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import {
  createHomeyManagerCommand,
  getManagerCommandNames,
} from '../../lib/api/ApiManagerCommand.mjs';

function createFakeYargs() {
  return {
    commandCalls: [],
    helpCalled: false,
    showHelpCalled: false,
    option() {
      return this;
    },
    command(...args) {
      this.commandCalls.push(args);
      return this;
    },
    help() {
      this.helpCalled = true;
      return this;
    },
    showHelp() {
      this.showHelpCalled = true;
    },
  };
}

function createManagerDefinition() {
  return {
    managerName: 'ManagerDevices',
    managerId: 'devices',
    managerIdCamelCase: 'devices',
    defaultOperationId: 'getDevices',
    operations: [
      {
        id: 'getDevices',
        cliName: 'get-devices',
        method: 'GET',
        path: '/devices',
        parameters: {},
      },
    ],
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe('ApiManagerCommand', () => {
  it('includes extension command names in completion candidates', () => {
    const managerDefinition = createManagerDefinition();
    const commandNames = getManagerCommandNames(managerDefinition, {
      commands: [
        {
          command: 'my-method <device-id>',
          describe: 'Custom command',
          handler: async () => {},
        },
      ],
    });

    assert.deepStrictEqual(commandNames, ['get-devices', 'my-method']);
  });

  it('shows manager help when invoked without a subcommand', async () => {
    const managerDefinition = createManagerDefinition();
    const fakeYargs = createFakeYargs();
    const processExit = mock.method(process, 'exit', () => {});
    const managerCommand = createHomeyManagerCommand({
      managerDefinition,
      extension: {
        commands: [
          {
            command: 'my-method',
            describe: 'Custom command',
            handler: async () => {},
          },
        ],
      },
    });

    managerCommand.builder(fakeYargs);
    await managerCommand.handler({ json: false });

    assert.strictEqual(fakeYargs.showHelpCalled, true);
    assert.strictEqual(processExit.mock.callCount(), 1);
    assert.deepStrictEqual(processExit.mock.calls[0].arguments, [0]);
  });

  it('rejects custom command collisions with generated operations', () => {
    const managerDefinition = createManagerDefinition();
    const managerCommand = createHomeyManagerCommand({
      managerDefinition,
      extension: {
        commands: [
          {
            command: 'get-devices',
            describe: 'Conflicting command',
            handler: async () => {},
          },
        ],
      },
    });

    assert.throws(
      () => managerCommand.builder(createFakeYargs()),
      /Custom command collision for devices: get-devices/,
    );
  });
});
