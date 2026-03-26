import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import { renderHomeySelectRuntime } from '../../lib/ui/homey-select/homey-select-runtime.mjs';

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

function createDeferred() {
  let reject;
  let resolve;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

function waitFor(predicate, timeoutMs = 500) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for select runtime output.'));
        return;
      }

      setTimeout(poll, 10);
    };

    poll();
  });
}

describe('homey select runtime', () => {
  it('creates an isolated store for each select run', async () => {
    const homeys = [
      {
        id: 'homey-office',
        name: 'Office',
        platform: 'local',
        state: 'online',
      },
      {
        id: 'homey-attic',
        name: 'Attic',
        platform: 'cloud',
        state: 'online',
      },
    ];

    const firstRunStreams = createRuntimeStreams();
    let firstRunOutput = '';

    firstRunStreams.stdout.on('data', (chunk) => {
      firstRunOutput += chunk.toString();
    });

    const firstRunPromise = renderHomeySelectRuntime(
      {
        homeys,
        title: 'Select a Homey',
      },
      firstRunStreams,
    );

    await waitFor(() => firstRunOutput.includes('2 Homeys'));
    firstRunStreams.stdin.write('a');
    firstRunStreams.stdin.write('t');
    firstRunStreams.stdin.write('t');
    await waitFor(() => firstRunOutput.includes('1 of 2 Homeys'));
    firstRunStreams.stdin.write('\r');

    const firstRunResult = await firstRunPromise;
    assert.strictEqual(firstRunResult.status, 'selected');
    assert.strictEqual(firstRunResult.homey.id, 'homey-attic');

    const secondRunStreams = createRuntimeStreams();
    let secondRunOutput = '';

    secondRunStreams.stdout.on('data', (chunk) => {
      secondRunOutput += chunk.toString();
    });

    const secondRunPromise = renderHomeySelectRuntime(
      {
        homeys,
        title: 'Select a Homey',
      },
      secondRunStreams,
    );

    await waitFor(() => secondRunOutput.includes('2 Homeys'));
    secondRunStreams.stdin.write('\r');

    const secondRunResult = await secondRunPromise;
    assert.strictEqual(secondRunResult.status, 'selected');
    assert.strictEqual(secondRunResult.homey.id, 'homey-office');
  });

  it('renders loading immediately and rerenders with the current badge after loading', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeySelectRuntime(
      {
        loadData: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            activeHomey: {
              id: 'homey-kitchen',
            },
            homeys: [
              {
                id: 'homey-kitchen',
                name: 'Kitchen',
                platform: 'cloud',
                state: 'online',
              },
            ],
          };
        },
        title: 'Select a Homey',
      },
      streams,
    );

    await waitFor(() => output.includes('Loading Homeys...'));
    await waitFor(() => output.includes('[current]'));

    streams.stdin.write('\r');

    const result = await resultPromise;

    assert.strictEqual(result.status, 'selected');
    assert.strictEqual(result.homey.id, 'homey-kitchen');
  });

  it('returns a cancelled result once and ignores late load resolution', async () => {
    const deferred = createDeferred();
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeySelectRuntime(
      {
        loadData: () => deferred.promise,
        title: 'Select a Homey',
      },
      streams,
    );

    await waitFor(() => output.includes('Loading Homeys...'));

    streams.stdin.write('\u0003');

    const result = await resultPromise;
    const outputAfterCancel = output;

    deferred.resolve({
      activeHomey: null,
      homeys: [
        {
          id: 'homey-late',
          name: 'Late Homey',
          platform: 'local',
          state: 'online',
        },
      ],
    });

    await new Promise((resolve) => setTimeout(resolve, 30));

    assert.deepStrictEqual(result, {
      status: 'cancelled',
    });
    assert.strictEqual(output, outputAfterCancel);
  });

  it('returns an error result when loadData rejects', async () => {
    const streams = createRuntimeStreams();
    const expectedError = new Error('boom');

    const result = await renderHomeySelectRuntime(
      {
        loadData: async () => {
          throw expectedError;
        },
        title: 'Select a Homey',
      },
      streams,
    );

    assert.strictEqual(result.status, 'error');
    assert.strictEqual(result.error, expectedError);
  });
});
