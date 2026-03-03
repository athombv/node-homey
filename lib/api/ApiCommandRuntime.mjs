'use strict';

import { HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../services/AthomApi.js';
import {
  DEFAULT_TIMEOUT,
} from './ApiCommandConstants.mjs';

function normalizeAddress(address) {
  return String(address).replace(/\/+$/, '');
}

export function getRequestTimeout(rawTimeout) {
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

  return new HomeyAPIV3Local({
    properties: {
      id: 'token-homey',
      softwareVersion: '0.0.0',
      localUrl: normalizedAddress,
      localUrlSecure: normalizedAddress,
    },
    strategy: [],
    baseUrl: normalizedAddress,
    token,
  });
}

export async function createHomeyApiClient({ token, address }) {
  validateAuthFlags({ token, address });

  if (token) {
    return createTokenHomeyApi({ token, address });
  }

  const activeHomey = await AthomApi.getSelectedHomey();

  if (!activeHomey) {
    throw new Error('No active Homey selected. Run `homey select` to choose one.');
  }

  return AthomApi.getActiveHomey();
}

export default {
  DEFAULT_TIMEOUT,
  createHomeyApiClient,
  getRequestTimeout,
};
