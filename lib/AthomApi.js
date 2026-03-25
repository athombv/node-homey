'use strict';

const path = require('path');
const os = require('os');
const readline = require('node:readline/promises');

const inquirer = require('inquirer');
const colors = require('colors');
const express = require('express');
const open = require('open');
const { AthomCloudAPI, APIErrorHomeyOffline, HomeyAPI } = require('homey-api');
const AthomCloudAPIToken = require('homey-api/lib/AthomCloudAPI/Token');

const AthomApiStorage = require('./AthomApiStorage');
const Log = require('./Log');
const Settings = require('../services/Settings');
const { ATHOM_API_CLIENT_ID, ATHOM_API_CLIENT_SECRET, ATHOM_API_LOGIN_URL } = require('../config');

const LOGIN_TIMEOUT_MS = 1000 * 60 * 5;

function getPreferredActiveHomeyStrategy(homey) {
  if (homey.platform === HomeyAPI.PLATFORMS.CLOUD) {
    return [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD];
  }

  return [
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
    HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
    HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
  ];
}

function getLocalDiscoveryAddresses() {
  const ifaces = os.networkInterfaces();
  const addresses = new Set();

  for (const adapters of Object.values(ifaces)) {
    for (const adapter of Object.values(adapters || [])) {
      if (!adapter || typeof adapter.address !== 'string') {
        continue;
      }

      const ip = adapter.address.split('.');
      if (ip[0] !== '10') {
        continue;
      }

      ip[3] = '1';
      addresses.add(ip.join('.'));
    }
  }

  return [...addresses];
}

async function enrichHomeysWithLocalDiscovery(homeys = []) {
  const discoveryResults = await Promise.allSettled(
    getLocalDiscoveryAddresses().map(async (ip) => {
      const res = await fetch(`http://${ip}/api/manager/webserver/ping`, {
        signal: AbortSignal.timeout(1000),
      });
      const homeyId = res.headers.get('x-homey-id');

      if (!homeyId) {
        return null;
      }

      return {
        homeyId,
        ip,
      };
    }),
  );

  for (const result of discoveryResults) {
    if (result.status !== 'fulfilled' || !result.value) {
      continue;
    }

    const homey = homeys.find((candidate) => candidate.id === result.value.homeyId);
    if (homey && !homey.usb) {
      homey.usb = result.value.ip;
    }
  }
}

function createLoginTimeoutError() {
  return new Error('Timeout getting authorization code!');
}

function normalizeAuthorizationCode(code) {
  if (typeof code !== 'string') {
    return '';
  }

  return code.trim();
}

async function promptForAuthorizationCode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await rl.question('Paste the code: ');
  } finally {
    rl.close();
  }
}

class AthomApi {
  constructor() {
    this._api = null;
    this._user = null;
    this._homeys = null;
    this._homeysLocalDiscovered = false;
    this._activeHomey = null;
  }

  _createApi() {
    this._store = new AthomApiStorage();
    this._api = new AthomCloudAPI({
      clientId: ATHOM_API_CLIENT_ID,
      clientSecret: ATHOM_API_CLIENT_SECRET,
      store: this._store,

      // Authenticate with Personal Access Token (PAT) if provided
      ...(process.env.HOMEY_PAT
        ? {
            autoRefreshTokens: false,
            token: new AthomCloudAPIToken({
              access_token: process.env.HOMEY_PAT,
            }),
          }
        : {}),
    });
  }

  async _initApi() {
    if (this._api) return this._api;

    this._createApi();

    // Migration from node-athom-api to node-homey-api
    const athomApiState = await Settings.get('_athom_api_state');
    if (athomApiState && athomApiState.athomCloudToken) {
      await Settings.set('homeyApi', {
        token: {
          token_type: 'bearer',
          access_token: athomApiState.athomCloudToken.access_token,
          refresh_token: athomApiState.athomCloudToken.refresh_token,
          expires_in: 3660,
          grant_type: 'authorization_code',
        },
      });
      await Settings.unset('_athom_api_state');
    }

    // Ensure the user is logged in
    if (!(await this._api.isLoggedIn())) {
      await this.login();
    }

    return this._api;
  }

  async login() {
    Log.success('Logging in...');
    const session = await this.createLoginSession();

    try {
      Log(
        colors.bold(
          'To log in with your Athom Account, please visit',
          colors.underline.cyan(session.url),
        ),
      );
      session.openBrowser();

      const authorizationCodeSources = [session.waitForAuthorizationCode()];

      if (process.stdin.isTTY) {
        authorizationCodeSources.push(promptForAuthorizationCode());
      }

      const code = await Promise.race(authorizationCodeSources);
      const profile = await session.authenticateWithCode(code);

      Log.success(
        `You are now logged in as ${profile.firstname} ${profile.lastname} <${profile.email}>`,
      );

      return profile;
    } catch (err) {
      if (err?.message === createLoginTimeoutError().message) {
        Log('');
      }

      throw err;
    } finally {
      session.close();
    }
  }

  async createLoginSession() {
    this._createApi();

    const app = express();
    const listener = await new Promise((resolve) => {
      const nextListener = app.listen(() => {
        resolve(nextListener);
      });
    });
    const port = listener.address().port;
    const url = `${ATHOM_API_LOGIN_URL}?port=${port}&clientId=${ATHOM_API_CLIENT_ID}`;
    let closed = false;
    let receivedCode;
    let resolveAuthorizationCode;

    const authorizationCodePromise = new Promise((resolve) => {
      resolveAuthorizationCode = resolve;
    });

    app.get('/auth', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'assets', '1px.png'));

      const code = normalizeAuthorizationCode(req.query.code);
      if (!code || closed) {
        return;
      }

      receivedCode = code;
      resolveAuthorizationCode(code);
    });

    return {
      authenticateWithCode: async (code) => {
        const normalizedCode = normalizeAuthorizationCode(code);
        if (!normalizedCode) {
          throw new Error('Invalid code!');
        }

        await this._api.authenticateWithAuthorizationCode({
          code: normalizedCode,
        });

        return this.getProfile();
      },
      close: () => {
        if (closed) {
          return;
        }

        closed = true;
        listener.close();
      },
      openBrowser: () => {
        return open(url).catch(() => {});
      },
      url,
      waitForAuthorizationCode: ({ timeoutMs = LOGIN_TIMEOUT_MS } = {}) => {
        if (receivedCode) {
          return Promise.resolve(receivedCode);
        }

        return Promise.race([
          authorizationCodePromise,
          new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(createLoginTimeoutError());
            }, timeoutMs);

            authorizationCodePromise.finally(() => {
              clearTimeout(timeout);
            });
          }),
        ]);
      },
    };
  }

  async logout() {
    Log.success('You are now logged out');
    await this._createApi();
    await this._api.logout();
    await this.unsetActiveHomey();
  }

  async getProfile() {
    await this._initApi();
    return this._api.getAuthenticatedUser();
  }

  async getHomey(homeyId) {
    const homeys = await this.getHomeys();
    for (let i = 0; i < homeys.length; i++) {
      const homey = homeys[i];
      if (homey.id === homeyId) return homey;
    }
    throw new Error(`Homey Not Found: ${homeyId}`);
  }

  async getHomeys({ cache = true, local = true } = {}) {
    if (cache && this._homeys && (!local || this._homeysLocalDiscovered)) return this._homeys;

    await this._initApi();

    if (!cache || !this._homeys) {
      this._user = this._user || (await this.getProfile());
      this._homeys = await this._user.getHomeys();
      this._homeysLocalDiscovered = false;
    }

    if (local && !this._homeysLocalDiscovered) {
      await enrichHomeysWithLocalDiscovery(this._homeys);
      this._homeysLocalDiscovered = true;
    }

    return this._homeys;
  }

  async getActiveHomey() {
    if (!this._activeHomey) {
      let activeHomey = await Settings.get('activeHomey');
      if (activeHomey === null) {
        activeHomey = await this.selectActiveHomey();
      }

      const homey = await this.getHomey(activeHomey.id);
      const strategy = getPreferredActiveHomeyStrategy(homey);
      const homeyApi = await homey.authenticate({ strategy }).catch((err) => {
        if (err instanceof APIErrorHomeyOffline) {
          throw new Error(
            `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same local network?`,
          );
        }
        throw err;
      });

      if (homey.usb) {
        homeyApi.__baseUrlPromise = Promise.resolve(`http://${homey.usb}:80`);
      }

      // Required when creating SDK client in App.js
      homeyApi.model = homey.model;

      this._activeHomey = homeyApi;
    }

    return this._activeHomey;
  }

  async setActiveHomey({ id, name, platform }) {
    return Settings.set('activeHomey', { id, name, platform });
  }

  async getSelectedHomey() {
    return Settings.get('activeHomey');
  }

  async unsetActiveHomey() {
    return Settings.unset('activeHomey');
  }

  async selectActiveHomey({
    id,
    name,
    filter = {
      online: true,
      local: true,
    },
  } = {}) {
    const homeys = await this.getHomeys();
    let activeHomey;

    if (typeof id === 'string') {
      activeHomey = homeys.find((homey) => homey.id === id);
    } else if (typeof name === 'string') {
      activeHomey = homeys.find((homey) => homey.name === name);
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'homey',
          message: 'Choose an active Homey:',
          choices: homeys
            .filter((homey) => {
              if (filter.online && homey.state && homey.state.indexOf('online') !== 0) return false;
              return true;
            })
            .map((homey) => ({
              value: {
                name: homey.name,
                id: homey.id,
                platform: homey.platform,
              },
              name: homey.name,
            })),
        },
      ]);

      activeHomey = answers.homey;
    }

    if (!activeHomey) {
      throw new Error('No Homey found');
    }

    const result = await this.setActiveHomey(activeHomey);

    Log(`You have selected \`${activeHomey.name}\` as your active Homey.`);

    return result;
  }

  async unselectActiveHomey() {
    await this.unsetActiveHomey();
    Log('You have unselected your active Homey.');
  }

  async createDelegationToken(opts) {
    await this._initApi();
    return this._api.createDelegationToken(opts);
  }
}

module.exports = AthomApi;
