import assert from 'node:assert';
import { PassThrough } from 'node:stream';
import { describe, it } from 'node:test';
import { renderHomeyLoginRuntime } from '../../lib/ui/homey-login-runtime.mjs';

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

function waitFor(predicate, timeoutMs = 5000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for login runtime output.'));
        return;
      }

      setTimeout(poll, 10);
    };

    poll();
  });
}

async function writeChars(stream, value, delayMs = 5) {
  for (const character of value) {
    stream.write(character);
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }
}

function createLoginSession({
  authenticateWithCode = async () => ({
    email: 'alice@example.com',
    firstname: 'Alice',
    lastname: 'Example',
  }),
  openBrowser = async () => {},
  url = 'https://my.homey.app/login',
  waitForAuthorizationCode = () => new Promise(() => {}),
} = {}) {
  let closeCalls = 0;

  return {
    authenticateWithCode,
    close() {
      closeCalls += 1;
    },
    get closeCalls() {
      return closeCalls;
    },
    openBrowser,
    url,
    waitForAuthorizationCode,
  };
}

describe('homey login runtime', () => {
  it('renders the centered waiting state with the login url and input', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const session = createLoginSession();
    const resultPromise = renderHomeyLoginRuntime(
      {
        createLoginSession: async () => session,
      },
      streams,
    );

    await waitFor(() => output.includes('Log in to Athom'));
    await waitFor(() => output.includes('https://my.homey.app/login'));
    await waitFor(() => output.includes('Paste authorization code'));

    streams.stdin.write('\u0003');

    const result = await resultPromise;
    assert.deepStrictEqual(result, {
      status: 'cancelled',
    });
    assert.ok(session.closeCalls >= 1);
  });

  it('renders a verifying state after manual submission and returns the authenticated profile', async () => {
    const streams = createRuntimeStreams();
    let output = '';
    const authenticateDeferred = createDeferred();

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const session = createLoginSession({
      authenticateWithCode: async (code) => {
        assert.strictEqual(code, 'abc123');
        return authenticateDeferred.promise;
      },
    });
    const resultPromise = renderHomeyLoginRuntime(
      {
        createLoginSession: async () => session,
      },
      streams,
    );

    await waitFor(() => output.includes('Paste authorization code'));

    await writeChars(streams.stdin, 'abc123');
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    streams.stdin.write('\r');

    await waitFor(() => output.includes('Verifying your authorization code...'));

    authenticateDeferred.resolve({
      email: 'alice@example.com',
      firstname: 'Alice',
      lastname: 'Example',
    });

    const result = await resultPromise;

    assert.strictEqual(result.status, 'authenticated');
    assert.strictEqual(result.profile.email, 'alice@example.com');
  });

  it('shows the timeout state and returns an error result', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyLoginRuntime(
      {
        createLoginSession: async () =>
          createLoginSession({
            waitForAuthorizationCode: async () => {
              throw new Error('Timeout getting authorization code!');
            },
          }),
      },
      streams,
    );

    await waitFor(() => output.includes('Login Timed Out'));

    const result = await resultPromise;

    assert.strictEqual(result.status, 'error');
    assert.match(result.error.message, /Timeout getting authorization code!/);
  });

  it('clears the code on first escape and cancels on the second', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyLoginRuntime(
      {
        createLoginSession: async () => createLoginSession(),
      },
      streams,
    );

    await waitFor(() => output.includes('Paste authorization code'));

    streams.stdin.write('a');
    streams.stdin.write('b');
    streams.stdin.write('c');
    await waitFor(() => output.includes('abc'));

    streams.stdin.write('\u001B');
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    streams.stdin.write('\u001B');

    const result = await resultPromise;
    assert.deepStrictEqual(result, {
      status: 'cancelled',
    });
  });

  it('cancels immediately on ctrl+c', async () => {
    const streams = createRuntimeStreams();
    let output = '';

    streams.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const resultPromise = renderHomeyLoginRuntime(
      {
        createLoginSession: async () => createLoginSession(),
      },
      streams,
    );

    await waitFor(() => output.includes('Log in to Athom'));

    streams.stdin.write('\u0003');

    const result = await resultPromise;
    assert.deepStrictEqual(result, {
      status: 'cancelled',
    });
  });
});
