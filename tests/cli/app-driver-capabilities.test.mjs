import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import {
  driverCapabilitiesCommandHelpers,
  handler,
} from '../../bin/cmds/app/driver/capabilities.mjs';
import AppFactory from '../../lib/AppFactory.js';
import Log from '../../lib/Log.js';

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

describe('CLI app driver capabilities', () => {
  it('uses the interactive flow in a TTY and logs success', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    const app = {};
    let exitCode;
    let successMessage;

    try {
      mock.method(AppFactory, 'getAppInstance', () => app);
      mock.method(
        driverCapabilitiesCommandHelpers,
        'runInteractiveFlow',
        async ({ app: nextApp }) => {
          assert.strictEqual(nextApp, app);

          return {
            driver: {
              id: 'light',
            },
            driverId: 'light',
            status: 'updated',
          };
        },
      );
      mock.method(Log, 'success', (message) => {
        successMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(exitCode, 0);
      assert.strictEqual(successMessage, 'Driver capabilities updated for `light`');
    } finally {
      restoreTerminal();
    }
  });

  it('falls back to the legacy prompt flow without an interactive TTY', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });
    let exitCode;
    let changeDriverCapabilitiesCalls = 0;

    try {
      mock.method(AppFactory, 'getAppInstance', () => ({
        async changeDriverCapabilities() {
          changeDriverCapabilitiesCalls += 1;
        },
      }));
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(changeDriverCapabilitiesCalls, 1);
      assert.strictEqual(exitCode, 0);
    } finally {
      restoreTerminal();
    }
  });

  it('logs cancellation and exits with code 1 when the interactive flow is cancelled', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let warningMessage;

    try {
      mock.method(AppFactory, 'getAppInstance', () => ({}));
      mock.method(driverCapabilitiesCommandHelpers, 'runInteractiveFlow', async () => ({
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
      assert.strictEqual(warningMessage, 'Driver capability update cancelled.');
    } finally {
      restoreTerminal();
    }
  });
});
