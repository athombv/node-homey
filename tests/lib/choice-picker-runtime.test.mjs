import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import { renderHomeyChoicePickerRuntime } from '../../lib/ui/choice-picker/homey-choice-picker-runtime.mjs';

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

function waitFor(predicate, timeoutMs = 5000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for choice picker output.'));
        return;
      }

      setTimeout(poll, 10);
    };

    poll();
  });
}

describe('choice picker runtime', { concurrency: false }, () => {
  it('filters and submits a single selected item', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyChoicePickerRuntime(
      {
        choices: [
          { label: 'Kitchen', searchTerms: ['kitchen'], value: 'kitchen' },
          { label: 'Attic', searchTerms: ['attic'], value: 'attic' },
        ],
        itemLabelPlural: 'Drivers',
        itemLabelSingular: 'Driver',
        title: 'Select a Driver',
      },
      streams,
    );

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });

    assert.match(output, /Select a Driver/);

    streams.stdin.write('a');
    streams.stdin.write('t');
    streams.stdin.write('t');

    await waitFor(() => output.includes('1 of 2 Drivers'));

    streams.stdin.write('\r');

    const result = await resultPromise;

    assert.strictEqual(result.status, 'submitted');
    assert.strictEqual(result.value, 'attic');
  });

  it('supports multi-select filtering, toggling, and back navigation', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyChoicePickerRuntime(
      {
        allowBack: true,
        choices: [
          { label: 'On/Off [onoff]', searchTerms: ['onoff'], value: 'onoff' },
          { label: 'Dim [dim]', searchTerms: ['dim'], value: 'dim' },
        ],
        defaultValues: ['onoff'],
        itemLabelPlural: 'Capabilities',
        itemLabelSingular: 'Capability',
        mode: 'multi',
        submitLabel: 'save',
        title: 'Driver Capabilities',
      },
      streams,
    );

    await waitFor(() => output.includes('2 Capabilities'));

    streams.stdin.write('d');
    streams.stdin.write('i');
    streams.stdin.write('m');
    await waitFor(() => output.includes('1 of 2 Capabilities'));

    streams.stdin.write(' ');
    streams.stdin.write('\u001B');
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    streams.stdin.write('\r');

    const result = await resultPromise;

    assert.strictEqual(result.status, 'submitted');
    assert.deepStrictEqual(result.values, ['onoff', 'dim']);
  });

  it('returns back when escape is pressed with an empty query and back is allowed', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyChoicePickerRuntime(
      {
        allowBack: true,
        choices: [{ label: 'On/Off [onoff]', value: 'onoff' }],
        itemLabelPlural: 'Capabilities',
        itemLabelSingular: 'Capability',
        mode: 'multi',
        title: 'Driver Capabilities',
      },
      streams,
    );

    await waitFor(() => output.includes('1 Capability'));

    streams.stdin.write('\u001B');

    const result = await resultPromise;

    assert.deepStrictEqual(result, {
      status: 'back',
    });
  });
});
