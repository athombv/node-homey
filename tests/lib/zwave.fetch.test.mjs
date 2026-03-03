import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import { afterEach, describe, it, mock } from 'node:test';

import ZWave from '../../lib/ZWave.js';

afterEach(() => {
  mock.restoreAll();
});

describe('ZWave remote JSON loading', () => {
  it('returns parsed JSON on successful HTTPS responses', async () => {
    mock.method(https, 'get', (url, options, callback) => {
      assert.strictEqual(url, 'https://products.z-wavealliance.org/Products/123/JSON');
      assert.strictEqual(options.rejectUnauthorized, false);

      const response = new EventEmitter();
      response.statusCode = 200;
      response.statusMessage = 'OK';
      response.setEncoding = () => {};

      process.nextTick(() => {
        callback(response);
        response.emit('data', '{"id":123}');
        response.emit('end');
      });

      return new EventEmitter();
    });

    const result = await ZWave.getSigmaDetails('123');

    assert.deepStrictEqual(result, { id: 123 });
  });

  it('throws the expected error when status code is not successful', async () => {
    mock.method(https, 'get', (_url, _options, callback) => {
      const response = new EventEmitter();
      response.statusCode = 404;
      response.statusMessage = 'Not Found';
      response.setEncoding = () => {};

      process.nextTick(() => {
        callback(response);
        response.emit('end');
      });

      return new EventEmitter();
    });

    await assert.rejects(async () => ZWave.getSigmaDetails('123'), /Invalid Sigma Product ID/);
  });

  it('throws the expected error when HTTPS request emits an error', async () => {
    mock.method(https, 'get', () => {
      const request = new EventEmitter();
      process.nextTick(() => {
        request.emit('error', new Error('socket error'));
      });
      return request;
    });

    await assert.rejects(async () => ZWave.getSigmaDetails('123'), /Invalid Sigma Product ID/);
  });
});
