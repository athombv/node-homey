import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import { loginCommandHelpers, formatLoggedInProfile, handler } from '../../bin/cmds/login.mjs';

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

describe('CLI login', () => {
  it('formats the logged in profile summary', () => {
    assert.strictEqual(
      formatLoggedInProfile({
        email: 'alice@example.com',
        firstname: 'Alice',
        lastname: 'Example',
      }),
      'You are now logged in as Alice Example <alice@example.com>',
    );
  });

  it('uses the fullscreen Ink runtime in an interactive TTY and prints the success summary', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let successMessage;

    try {
      mock.method(loginCommandHelpers, 'runInteractiveLogin', async () => ({
        profile: {
          email: 'alice@example.com',
          firstname: 'Alice',
          lastname: 'Example',
        },
        status: 'authenticated',
      }));
      mock.method(loginCommandHelpers, 'runTextLogin', async () => {
        throw new Error('Text fallback should not run');
      });
      mock.method(Log, 'success', (message) => {
        successMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({});

      assert.strictEqual(exitCode, 0);
      assert.strictEqual(
        successMessage,
        'You are now logged in as Alice Example <alice@example.com>',
      );
    } finally {
      restoreTerminal();
    }
  });

  it('uses the text fallback path without a TTY', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });
    let exitCode;
    let loginCalls = 0;

    try {
      mock.method(loginCommandHelpers, 'runTextLogin', async () => {
        loginCalls += 1;
      });
      mock.method(loginCommandHelpers, 'runInteractiveLogin', async () => {
        throw new Error('Fullscreen runtime should not run');
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({});

      assert.strictEqual(loginCalls, 1);
      assert.strictEqual(exitCode, 0);
    } finally {
      restoreTerminal();
    }
  });

  it('logs cancellation and exits with code 1 when the fullscreen flow is cancelled', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let warningMessage;

    try {
      mock.method(loginCommandHelpers, 'runInteractiveLogin', async () => ({
        status: 'cancelled',
      }));
      mock.method(Log, 'warning', (message) => {
        warningMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({});

      assert.strictEqual(exitCode, 1);
      assert.strictEqual(warningMessage, 'Login cancelled.');
    } finally {
      restoreTerminal();
    }
  });
});
