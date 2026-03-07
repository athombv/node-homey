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

function validateAuthFlags({ token, address, homeyId }) {
  if (token && address && homeyId) {
    throw new Error(
      'Invalid option usage: --address and --homey-id cannot be used together with --token.',
    );
  }

  if (token && !address && !homeyId) {
    throw new Error('Missing required option: --address or --homey-id (required with --token).');
  }

  if (!token && address) {
    throw new Error('Invalid option usage: --address can only be used together with --token.');
  }
}

function createTokenHomeyApi({ token, address, homeyId = 'token-homey' }) {
  const normalizedAddress = normalizeAddress(address);
  const parsedAddress = parseAddress(normalizedAddress);
  const properties = {
    id: homeyId,
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

function applyResolvedHomeyMetadata(homeyApi, homey) {
  if (homey.usb) {
    // Keep USB override behavior in sync with existing AthomApi implementation.
    homeyApi.__baseUrlPromise = Promise.resolve(`http://${homey.usb}:80`);
  }

  homeyApi.model = homey.model;
  return homeyApi;
}

function getPreferredAuthenticateStrategy(homey) {
  if (homey.platform === HomeyAPI.PLATFORMS.CLOUD) {
    return [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD];
  }

  return [
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
    HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
  ];
}

async function resolveRequestedHomey(homeyId) {
  if (typeof homeyId === 'string' && homeyId.length > 0) {
    return AthomApi.getHomey(homeyId);
  }

  const activeHomey = await AthomApi.getSelectedHomey();

  if (!activeHomey) {
    throw new Error('No active Homey selected. Run `homey select` to choose one.');
  }

  return AthomApi.getHomey(activeHomey.id);
}

async function authenticateHomey(homey) {
  try {
    const homeyApi = await homey.authenticate({
      strategy: getPreferredAuthenticateStrategy(homey),
    });
    return applyResolvedHomeyMetadata(homeyApi, homey);
  } catch (err) {
    if (err instanceof APIErrorHomeyOffline) {
      throw new Error(
        `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same LAN network?`,
      );
    }

    throw err;
  }
}

function getTokenModeAddressForHomey(homey) {
  if (homey.usb) {
    return `http://${homey.usb}:80`;
  }

  if (homey.localUrlSecure) {
    return homey.localUrlSecure;
  }

  if (homey.localUrl) {
    return homey.localUrl;
  }

  const homeyLabel = homey.name ? `${homey.name} (${homey.id})` : homey.id;
  throw new Error(`${homeyLabel} does not expose a usable local address for token mode.`);
}

async function createTokenHomeyApiForHomey({ token, homeyId }) {
  const homey = await AthomApi.getHomey(homeyId);
  const homeyApi = createTokenHomeyApi({
    token,
    address: getTokenModeAddressForHomey(homey),
    homeyId: homey.id,
  });

  return applyResolvedHomeyMetadata(homeyApi, homey);
}

export async function createHomeyApiClient({ token, address, homeyId }) {
  validateAuthFlags({ token, address, homeyId });

  if (token && address) {
    return createTokenHomeyApi({ token, address });
  }

  if (token && homeyId) {
    return createTokenHomeyApiForHomey({ token, homeyId });
  }

  const homey = await resolveRequestedHomey(homeyId);
  return authenticateHomey(homey);
}

export async function disposeHomeyApiClient(api) {
  if (!api || typeof api !== 'object') {
    return;
  }

  for (const manager of Object.values(api.__managers || {})) {
    if (typeof manager?.destroy === 'function') {
      manager.destroy();
    }
  }

  for (const [key, value] of Object.entries(api.__refreshMap || {})) {
    if (key.endsWith('timeout')) {
      clearTimeout(value);
      delete api.__refreshMap[key];
    }
  }

  if (typeof api.disconnect === 'function') {
    await api.disconnect().catch(() => {});
  }

  if (typeof api.destroy === 'function') {
    api.destroy();
  }
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
  disposeHomeyApiClient,
  getRequestTimeout,
};
