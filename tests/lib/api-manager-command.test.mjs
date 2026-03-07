import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import {
  assertOperationSupportedByHomeyPlatform,
  createHomeyManagerCommand,
  getManagerCommandNames,
} from '../../lib/api/ApiManagerCommand.mjs';
import { HOMEY_API_AVAILABILITY } from '../../lib/api/ApiCommandDefinition.mjs';

function createFakeYargs() {
  return {
    commandCalls: [],
    epilogValue: null,
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
    epilog(value) {
      this.epilogValue = value;
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
    managerCliName: 'devices',
    defaultOperationId: 'getDevices',
    operations: [
      {
        id: 'getDevices',
        cliName: 'get-devices',
        method: 'GET',
        path: '/devices',
        parameters: {},
        availability: HOMEY_API_AVAILABILITY.LOCAL,
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

    assert.deepStrictEqual(commandNames, ['schema', 'get-devices', 'my-method']);
  });

  it('uses the kebab-case manager CLI name for the top-level command', () => {
    const managerCommand = createHomeyManagerCommand({
      managerDefinition: {
        ...createManagerDefinition(),
        managerName: 'ManagerGoogleAssistant',
        managerId: 'google-assistant',
        managerIdCamelCase: 'googleAssistant',
        managerCliName: 'google-assistant',
      },
    });

    assert.strictEqual(managerCommand.command, 'google-assistant');
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

  it('labels exclusive operations in generated help output', () => {
    const managerDefinition = createManagerDefinition();
    const fakeYargs = createFakeYargs();
    const managerCommand = createHomeyManagerCommand({
      managerDefinition,
    });

    managerCommand.builder(fakeYargs);

    const operationCommand = fakeYargs.commandCalls.find(
      ([commandName]) => commandName === 'get-devices',
    );

    assert.ok(operationCommand);
    assert.match(operationCommand[1], /\[local\]/);

    const operationYargs = createFakeYargs();
    operationCommand[2](operationYargs);

    assert.strictEqual(operationYargs.epilogValue, 'Platform: local.');
  });

  it('registers a schema subcommand for every generated manager', () => {
    const managerDefinition = createManagerDefinition();
    const fakeYargs = createFakeYargs();
    const managerCommand = createHomeyManagerCommand({
      managerDefinition,
    });

    managerCommand.builder(fakeYargs);

    const schemaCommand = fakeYargs.commandCalls.find(([commandName]) => commandName === 'schema');

    assert.ok(schemaCommand);
    assert.strictEqual(fakeYargs.commandCalls[0][0], 'schema');
    assert.match(schemaCommand[1], /Inspect schema/);
  });

  it('rejects execution when the Homey platform does not support the operation', () => {
    assert.throws(
      () =>
        assertOperationSupportedByHomeyPlatform(
          {
            cliName: 'delete',
            availability: HOMEY_API_AVAILABILITY.CLOUD,
          },
          'local',
        ),
      /requires platform cloud.*local Homey/,
    );
  });
});
