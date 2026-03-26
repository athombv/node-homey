import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';

import AppFactory from '../../lib/AppFactory.js';
import { renderHomeyAppCreateRuntime } from '../../lib/ui/homey-app-create/homey-app-create-runtime.mjs';

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
        reject(new Error('Timed out waiting for app create runtime output.'));
        return;
      }

      setTimeout(poll, 10);
    };

    poll();
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

async function pressEnterTimes(stream, count, delayMs = 20) {
  for (let index = 0; index < count; index += 1) {
    stream.write('\r');
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}

describe('homey app create runtime', () => {
  it('submits the default app create answers through the wizard', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    try {
      streams.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      const resultPromise = renderHomeyAppCreateRuntime(
        {
          questionGroups: AppFactory.getCreateNewAppQuestionGroups(),
        },
        streams,
      );

      await waitFor(() => output.includes("What is your app's name?"));
      await pressEnterTimes(streams.stdin, 10);

      const result = await resultPromise;

      assert.match(stripAnsi(output), /└ Hit Enter to create/);
      assert.match(stripAnsi(output), /● Name: My App/);
      assert.match(stripAnsi(output), /● Platforms: Homey Pro/);
      assert.strictEqual(result.status, 'submitted');
      assert.strictEqual(result.answers.appName, 'My App');
      assert.strictEqual(result.answers.appDescription, 'Adds support for MyBrand devices.');
      assert.strictEqual(result.answers.id, 'com.company.myapp');
      assert.deepStrictEqual(result.answers.platforms, ['local']);
      assert.strictEqual(result.answers.license, true);
      assert.strictEqual(result.answers['programming-language'], 'javascript');
      assert.strictEqual(result.answers['github-workflows'], false);
      assert.strictEqual(result.answers.eslint, true);
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

      const resultPromise = renderHomeyAppCreateRuntime(
        {
          questionGroups: AppFactory.getCreateNewAppQuestionGroups(),
        },
        streams,
      );

      await waitFor(() => output.includes('Create a Homey App'));
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
