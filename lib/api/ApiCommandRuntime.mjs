'use strict';

import { createRequire } from 'node:module';

import { APIErrorHomeyOffline, HomeyAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../services/AthomApi.js';
import { DEFAULT_TIMEOUT } from './ApiCommandConstants.mjs';

const require = createRequire(import.meta.url);
const HomeyApiUtil = require('homey-api/lib/Util');

function normalizeAddress(address) {
  return String(address).replace(/\/+$/, '');
}

function parseAddress(address) {
  try {
    return new URL(address);
  } catch {
    throw new Error('Invalid address. Please provide an absolute URL, e.g. http://192.168.1.100.');
  }
}

export function getRequestTimeout(rawTimeout) {
  // Keep this guard for non-yargs callers that may not pass a timeout.
  if (typeof rawTimeout === 'undefined') {
    return DEFAULT_TIMEOUT;
  }

  const timeout = Number(rawTimeout);

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('Invalid timeout. Please provide a positive number in milliseconds.');
  }

  return timeout;
}

function validateAuthFlags({ token, address }) {
  if (token && !address) {
    throw new Error('Missing required option: --address (required with --token).');
  }

  if (!token && address) {
    throw new Error('Invalid option usage: --address can only be used together with --token.');
  }
}

function createTokenHomeyApi({ token, address }) {
  const normalizedAddress = normalizeAddress(address);
  const parsedAddress = parseAddress(normalizedAddress);
  const properties = {
    id: 'token-homey',
    softwareVersion: '0.0.0',
  };

  if (parsedAddress.protocol === 'https:') {
    properties.localUrlSecure = normalizedAddress;
  } else {
    properties.localUrl = normalizedAddress;
  }

  return new HomeyAPIV3Local({
    properties,
    strategy: [],
    baseUrl: normalizedAddress,
    token,
  });
}

async function authenticateSelectedHomey() {
  const activeHomey = await AthomApi.getSelectedHomey();

  if (!activeHomey) {
    throw new Error('No active Homey selected. Run `homey select` to choose one.');
  }

  const homey = await AthomApi.getHomey(activeHomey.id);

  const strategyCandidates =
    homey.platform === HomeyAPI.PLATFORMS.CLOUD
      ? [[HomeyAPI.DISCOVERY_STRATEGIES.CLOUD]]
      : [
          [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL],
          [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE],
          [HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED],
        ];

  let lastError = null;

  for (const strategy of strategyCandidates) {
    try {
      const homeyApi = await homey.authenticate({ strategy });

      if (homey.usb) {
        // Keep USB override behavior in sync with existing AthomApi implementation.
        homeyApi.__baseUrlPromise = Promise.resolve(`http://${homey.usb}:80`);
      }

      homeyApi.model = homey.model;
      return homeyApi;
    } catch (err) {
      lastError = err;

      // Continue to next strategy for recoverable connectivity issues.
      if (err instanceof APIErrorHomeyOffline) {
        continue;
      }

      throw err;
    }
  }

  if (lastError instanceof APIErrorHomeyOffline) {
    throw new Error(
      `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same LAN network?`,
    );
  }

  throw lastError;
}

export async function createHomeyApiClient({ token, address }) {
  validateAuthFlags({ token, address });

  if (token) {
    return createTokenHomeyApi({ token, address });
  }

  return authenticateSelectedHomey();
}

export async function callHomeyApi({ api, callOptions, captureMetadata = false }) {
  if (!captureMetadata) {
    const startedAt = Date.now();
    const result = await api.call(callOptions);

    return {
      result,
      durationMs: Date.now() - startedAt,
      request: null,
      response: null,
    };
  }

  const originalFetch = HomeyApiUtil.fetch;
  const metadata = {
    request: null,
    response: null,
  };
  const startedAt = Date.now();

  HomeyApiUtil.fetch = async (url, options, timeoutDuration, timeoutMessage) => {
    metadata.request = {
      url,
      method: options?.method,
      headers: options?.headers || {},
      timeoutDuration,
    };

    const response = await originalFetch.call(
      HomeyApiUtil,
      url,
      options,
      timeoutDuration,
      timeoutMessage,
    );

    metadata.response = {
      url: response.url || url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentType: response.headers.get('content-type'),
    };

    return response;
  };

  try {
    const result = await api.call(callOptions);

    return {
      result,
      durationMs: Date.now() - startedAt,
      request: metadata.request,
      response: metadata.response,
    };
  } finally {
    HomeyApiUtil.fetch = originalFetch;
  }
}

export default {
  callHomeyApi,
  createHomeyApiClient,
  getRequestTimeout,
};
