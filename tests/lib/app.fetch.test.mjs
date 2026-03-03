import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import App from '../../lib/App.js';

afterEach(() => {
  mock.restoreAll();
});

describe('App fetch helpers', () => {
  it('converts local file responses into Buffer payloads', async () => {
    const app = new App('.');

    mock.method(global, 'fetch', async (url) => {
      assert.strictEqual(url, 'http://localhost:4321/assets/icon.svg');
      return {
        status: 200,
        headers: {
          get: (name) => {
            if (name === 'Content-Type') return 'image/svg+xml';
            if (name === 'X-Homey-Hash') return 'abc123';
            return null;
          },
        },
        arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      };
    });

    const result = await app._getLocalFileResponse({
      serverPort: 4321,
      assetPath: '/assets/icon.svg',
    });

    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.headers, {
      'Content-Type': 'image/svg+xml',
      'X-Homey-Hash': 'abc123',
    });
    assert.ok(Buffer.isBuffer(result.body));
    assert.deepStrictEqual([...result.body], [1, 2, 3]);
  });

  it('passes expected request options when uploading archives', async () => {
    const app = new App('.');
    const archiveStream = { type: 'stream-like' };
    let capturedUrl;
    let capturedOptions;

    mock.method(global, 'fetch', async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
      };
    });

    await app._uploadBuildArchive({
      url: 'https://upload.example.com',
      method: 'PUT',
      headers: {
        Authorization: 'Bearer token',
      },
      archiveStream,
      size: 1024,
    });

    assert.strictEqual(capturedUrl, 'https://upload.example.com');
    assert.strictEqual(capturedOptions.method, 'PUT');
    assert.strictEqual(capturedOptions.body, archiveStream);
    assert.strictEqual(capturedOptions.duplex, 'half');
    assert.strictEqual(capturedOptions.headers.Authorization, 'Bearer token');
    assert.strictEqual(capturedOptions.headers['Content-Length'], 1024);
  });

  it('throws when archive upload responds with non-ok status', async () => {
    const app = new App('.');

    mock.method(global, 'fetch', async () => ({
      ok: false,
      statusText: 'Forbidden',
    }));

    await assert.rejects(
      async () =>
        app._uploadBuildArchive({
          url: 'https://upload.example.com',
          method: 'PUT',
          headers: {},
          archiveStream: {},
          size: 1,
        }),
      /Forbidden/,
    );
  });
});
