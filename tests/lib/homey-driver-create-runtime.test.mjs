import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';

import { renderHomeyDriverCreateRuntime } from '../../lib/ui/homey-driver-create/homey-driver-create-runtime.mjs';

function createFakeStdout() {
  const stdout = new PassThrough();
  stdout.isTTY = true;
  stdout.columns = 80;
  stdout.rows = 24;
  stdout.getColorDepth = () => 8;
  return stdout;
}

function createFakeStdin() {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.setRawMode = () => {};
  stdin.resume = () => stdin;
  stdin.pause = () => stdin;
  stdin.ref = () => {};
  stdin.unref = () => {};
  return stdin;
}

function createRuntimeStreams() {
  return {
    stderr: new PassThrough(),
    stdin: createFakeStdin(),
    stdout: createFakeStdout(),
  };
}

function closeRuntimeStreams(streams) {
  streams.stdin.end();
  streams.stdout.end();
  streams.stderr.end();
}

function waitFor(predicate, timeoutMs = 5000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for driver create runtime output.'));
        return;
      }

      setTimeout(poll, 10);
    };

    poll();
  });
}

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function stripAnsi(value) {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '\u001B' || value[index + 1] !== '[') {
      result += value[index];
      continue;
    }

    index += 2;

    while (index < value.length) {
      const code = value.charCodeAt(index);

      if (code >= 0x40 && code <= 0x7e) {
        break;
      }

      index += 1;
    }
  }

  return result;
}

describe('homey driver create runtime', { concurrency: false }, () => {
  it('submits a small driver-create flow with searchable list and checkbox steps', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    try {
      streams.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      const resultPromise = renderHomeyDriverCreateRuntime(
        {
          questionDefinitions: [
            {
              default: 'My Driver',
              message: "What is your Driver's Name?",
              name: 'driverName',
              type: 'input',
              validate(value) {
                return value.length > 0;
              },
            },
            {
              choices: [
                { label: 'Socket [socket]', searchTerms: ['socket'], value: 'socket' },
                { label: 'Light [light]', searchTerms: ['light'], value: 'light' },
              ],
              message: "What is your Driver's Device Class?",
              name: 'driverClass',
              searchable: true,
              type: 'searchable-list',
            },
            {
              choices: [
                { label: 'On/Off [onoff]', searchTerms: ['onoff'], value: 'onoff' },
                { label: 'Dim [dim]', searchTerms: ['dim'], value: 'dim' },
              ],
              message: "What are your Driver's Capabilities?",
              name: 'driverCapabilities',
              searchable: true,
              type: 'searchable-checkbox',
            },
          ],
        },
        streams,
      );

      await sleep(150);
      assert.match(stripAnsi(output), /What is your Driver's Name\?/);
      streams.stdin.write('\r');

      await sleep(120);
      assert.match(stripAnsi(output), /What is your Driver's Device Class\?/);
      streams.stdin.write('l');
      streams.stdin.write('i');
      streams.stdin.write('g');
      await sleep(120);
      assert.match(stripAnsi(output), /Filter: lig/);
      streams.stdin.write('\r');

      await sleep(120);
      assert.match(stripAnsi(output), /What are your Driver's Capabilities\?/);
      streams.stdin.write('o');
      streams.stdin.write('n');
      await sleep(120);
      assert.match(stripAnsi(output), /Filter: on/);
      streams.stdin.write(' ');
      await sleep(120);
      streams.stdin.write('\r');

      await sleep(160);
      assert.match(stripAnsi(output), /Hit Enter to create/);
      streams.stdin.write('\r');

      const result = await resultPromise;

      assert.strictEqual(result.status, 'submitted');
      assert.strictEqual(result.answers.driverName, 'My Driver');
      assert.strictEqual(result.answers.driverClass, 'light');
      assert.deepStrictEqual(result.answers.driverCapabilities, ['onoff']);
    } finally {
      closeRuntimeStreams(streams);
    }
  });

  it('returns a cancelled result on ctrl+c', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    try {
      streams.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      const resultPromise = renderHomeyDriverCreateRuntime(
        {
          questionDefinitions: [
            {
              default: 'My Driver',
              message: "What is your Driver's Name?",
              name: 'driverName',
              type: 'input',
            },
          ],
        },
        streams,
      );

      await waitFor(() => stripAnsi(output).includes('Create a Driver'));
      streams.stdin.write('\u0003');

      const result = await resultPromise;
      assert.deepStrictEqual(result, {
        status: 'cancelled',
      });
    } finally {
      closeRuntimeStreams(streams);
    }
  });
});
