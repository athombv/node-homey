import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { formatSelectedHomeyName, handler, SelectCommandHelpers } from '../../bin/cmds/select.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

function setTerminalInteractivity({ stdinIsTTY, stdoutIsTTY }) {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinIsTTY,
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutIsTTY,
  });

  return () => {
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    } else {
      delete process.stdin.isTTY;
    }

    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    } else {
      delete process.stdout.isTTY;
    }
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe('CLI select', () => {
  it('formats the selected Homey name with the selector accent color on a TTY', () => {
    const previousNoColor = process.env.NO_COLOR;
    delete process.env.NO_COLOR;

    try {
      assert.strictEqual(
        formatSelectedHomeyName('JWLSHS', {
          isTTY: true,
        }),
        '\u001B[1m\u001B[38;2;0;130;250mJWLSHS\u001B[39m\u001B[22m',
      );
    } finally {
      if (previousNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = previousNoColor;
      }
    }
  });

  it('keeps the selected Homey name plain when output is not a TTY', () => {
    assert.strictEqual(
      formatSelectedHomeyName('JWLSHS', {
        isTTY: false,
      }),
      'JWLSHS',
    );
  });

  it('passes the selected Homey id to AthomApi', async () => {
    let exitCode;
    let selectionArgs;

    mock.method(AthomApi, 'selectActiveHomey', async (args) => {
      selectionArgs = args;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ id: 'homey-1' });

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(selectionArgs, {
      id: 'homey-1',
      name: undefined,
    });
  });

  it('passes the selected Homey name to AthomApi', async () => {
    let exitCode;
    let selectionArgs;

    mock.method(AthomApi, 'selectActiveHomey', async (args) => {
      selectionArgs = args;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ name: 'Living Room' });

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(selectionArgs, {
      id: undefined,
      name: 'Living Room',
    });
  });

  it('logs the selected Homey after interactive selection', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let loggedMessage;
    let savedHomey;

    try {
      mock.method(AthomApi, 'setActiveHomey', async (homey) => {
        savedHomey = homey;
      });
      mock.method(Log, 'warning', () => {
        throw new Error('Selection should not be cancelled');
      });
      mock.method(Log, 'error', (error) => {
        throw error;
      });
      mock.method(console, 'log', (message) => {
        loggedMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      mock.method(SelectCommandHelpers, 'runInteractiveSelection', async () => ({
        homey: {
          id: 'homey-1',
          name: 'Living Room',
          platform: 'local',
        },
        status: 'selected',
      }));

      await handler({});

      assert.strictEqual(exitCode, 0);
      assert.deepStrictEqual(savedHomey, {
        id: 'homey-1',
        name: 'Living Room',
        platform: 'local',
      });
      assert.match(loggedMessage, /You have selected .*Living Room.* as your active Homey\./);
    } finally {
      restoreTerminal();
    }
  });

  it('logs an error and exits with code 1 when selection fails', async () => {
    const expectedError = new Error('boom');
    let exitCode;
    let loggedError;

    mock.method(AthomApi, 'selectActiveHomey', async () => {
      throw expectedError;
    });
    mock.method(Log, 'error', (err) => {
      loggedError = err;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ id: 'homey-1' });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(loggedError, expectedError);
  });

  it('rejects the removed --current flag', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', '--current'], homeyHome);

    assertFailure(result, 'homey select --current');
    assert.match(result.stderr, /Unknown argument: current/);
  });

  it('fails with guidance when interactive selection is requested without a TTY', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select'], homeyHome);

    assertFailure(result, 'homey select');
    assert.match(result.stdout, /Interactive selection requires a TTY/);
    assert.match(result.stdout, /homey select --id <HOMEY_ID>/);
  });
});
