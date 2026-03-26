import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import { AppCreateCommandHelpers, handler } from '../../bin/cmds/app/create.mjs';

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

describe('CLI app create', () => {
  it('uses the Ink wizard in an interactive TTY and submits the collected answers', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let createArgs;
    let exitCode;

    try {
      mock.method(AppCreateCommandHelpers, 'runInteractiveCreateWizard', async () => ({
        answers: {
          id: 'com.example.app',
        },
        status: 'submitted',
      }));
      mock.method(AppCreateCommandHelpers, 'createAppWithAnswers', async (args) => {
        createArgs = args;
      });
      mock.method(AppCreateCommandHelpers, 'promptCreateApp', async () => {
        throw new Error('Prompt fallback should not run');
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(exitCode, 0);
      assert.deepStrictEqual(createArgs, {
        answers: {
          id: 'com.example.app',
        },
        appPath: '/tmp/app-root',
      });
    } finally {
      restoreTerminal();
    }
  });

  it('falls back to the prompt-based flow without an interactive TTY', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });
    let promptArgs;
    let exitCode;

    try {
      mock.method(AppCreateCommandHelpers, 'promptCreateApp', async (args) => {
        promptArgs = args;
      });
      mock.method(AppCreateCommandHelpers, 'runInteractiveCreateWizard', async () => {
        throw new Error('Ink wizard should not run');
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/fallback-root' });

      assert.strictEqual(exitCode, 0);
      assert.deepStrictEqual(promptArgs, {
        appPath: '/tmp/fallback-root',
      });
    } finally {
      restoreTerminal();
    }
  });

  it('logs cancellation and exits with code 1 when the Ink wizard is cancelled', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let warningMessage;

    try {
      mock.method(AppCreateCommandHelpers, 'runInteractiveCreateWizard', async () => ({
        status: 'cancelled',
      }));
      mock.method(Log, 'warning', (message) => {
        warningMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(exitCode, 1);
      assert.strictEqual(warningMessage, 'App creation cancelled.');
    } finally {
      restoreTerminal();
    }
  });
});
