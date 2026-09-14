'use strict';

const path = require('path');
const os = require('os');
const { createHash } = require('crypto');

const inquirer = require('inquirer');
const colors = require('colors');
const express = require('express');
const open = require('open');
const { AthomCloudAPI, APIErrorHomeyOffline, HomeyAPI } = require('homey-api');
const AthomCloudAPIToken = require('homey-api/lib/AthomCloudAPI/Token');

const AthomApiStorage = require('./AthomApiStorage');
const { AthomApiProfileCache } = require('./AthomApiProfileCache');
const { HomeyUsb } = require('./HomeyUsb');
const Log = require('./Log');
const Settings = require('../services/Settings');
const { ATHOM_API_CLIENT_ID, ATHOM_API_CLIENT_SECRET, ATHOM_API_LOGIN_URL } = require('../config');

const PROFILE_CACHE_TTL = 5 * 60 * 1000;
// homey-api errors expose statusCode, but do not expose Retry-After headers.
const PROFILE_RATE_LIMIT_COOLDOWN = 60 * 1000;

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

class AthomApi {
  constructor() {
    this._api = null;
    this._user = null;
    this._homeys = new Map();
    this._activeHomey = new Map();
  }

  _createApi() {
    this._user = null;
    this._homeys.clear();
    this._activeHomey.clear();
    this._profileAuthKey = process.env.HOMEY_PAT
      ? `pat:${createHash('sha256').update(process.env.HOMEY_PAT).digest('hex')}`
      : null;
    this._store = new AthomApiStorage();
    this._profileCache = new AthomApiProfileCache();
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
    let listener;

    this._createApi();

    const app = express();
    const port = await new Promise((resolve) => {
      listener = app.listen(() => {
        resolve(listener.address().port);
      });
    });

    const url = `${ATHOM_API_LOGIN_URL}?port=${port}&clientId=${ATHOM_API_CLIENT_ID}`;
    Log(colors.bold('To log in with your Athom Account, please visit', colors.underline.cyan(url)));
    open(url).catch((err) => {});

    const code = await Promise.race([
      // Input code automatically by webserver
      Promise.resolve().then(async () => {
        const codePromise = new Promise((resolve) => {
          app.get('/auth', (req, res) => {
            res.sendFile(path.join(__dirname, '..', 'assets', '1px.png'));
            if (req.query.code) {
              Log(req.query.code);
              resolve(req.query.code);
            }
          });
        });
        return codePromise;
      }),

      // Input code manually
      inquirer
        .prompt([
          {
            type: 'text',
            name: 'receivedCode',
            message: 'Paste the code:',
          },
        ])
        .then(({ receivedCode }) => {
          if (!receivedCode) {
            throw new Error('Invalid code!');
          }
          return receivedCode;
        }),

      new Promise((resolve, reject) => {
        setTimeout(
          () => {
            Log('');
            reject(new Error('Timeout getting authorization code!'));
          },
          1000 * 60 * 5,
        ); // 5 minutes
      }),
    ]);

    listener.close();

    await this._authenticateWithAuthorizationCode({ code });

    try {
      const profile = await this.getProfile();

      Log.success(
        `You are now logged in as ${profile.firstname} ${profile.lastname} <${profile.email}>`,
      );
    } catch (err) {
      Log.error(`Invalid Account Token, please try again:${err.stack}`);
    }
  }

  async _authenticateWithAuthorizationCode({ code }) {
    const token = await this._api.authenticateWithAuthorizationCode({ code });
    this._profileAuthKey = `oauth:${createHash('sha256').update(token.access_token).digest('hex')}`;
    await this._profileCache.clear().catch((err) => {
      Log.warning('Could not clear the account profile cache:', err);
    });
  }

  async logout() {
    Log.success('You are now logged out');
    await this._createApi();
    await this._api.logout();
    await this._profileCache.clear().catch((err) => {
      Log.warning('Could not clear the account profile cache:', err);
    });
    await this.unsetActiveHomey();
  }

  async getProfile({ cache = true } = {}) {
    await this._initApi();

    // Capture the credential before the request; login may change it while a response is pending.
    const api = this._api;
    const authKey = await this._getProfileAuthKey();
    let stored;

    try {
      stored = await this._profileCache.get();
    } catch (err) {
      Log.warning('Could not read the account profile cache:', err);
    }

    const hasCachedProfile = Boolean(authKey && stored?.user && stored.authKey === authKey);
    const now = Date.now();
    const isFresh = hasCachedProfile && now - stored.updatedAt < PROFILE_CACHE_TTL;
    const isCoolingDown = hasCachedProfile && now < stored.retryAfter;

    if ((cache && isFresh) || isCoolingDown) {
      return new AthomCloudAPI.User({ api, properties: stored.user });
    }

    let properties;

    try {
      properties = await api.call({ method: 'get', path: '/user/me' });
    } catch (err) {
      if (err.statusCode !== 429 || !hasCachedProfile) {
        throw err;
      }

      try {
        const updated = await this._profileCache.setRetryAfter({
          authKey,
          retryAfter: Date.now() + PROFILE_RATE_LIMIT_COOLDOWN,
        });

        if (updated) {
          stored = updated;
        }
      } catch (writeError) {
        Log.warning('Could not save the account profile cooldown:', writeError);
      }

      return new AthomCloudAPI.User({ api, properties: stored.user });
    }

    const profile = new AthomCloudAPI.User({ api, properties });

    if (authKey) {
      await this._profileCache
        .set({
          user: properties,
          authKey,
          updatedAt: Date.now(),
        })
        .catch((err) => {
          Log.warning('Could not save the account profile cache:', err);
        });
    }

    return profile;
  }

  async _getProfileAuthKey() {
    if (this._profileAuthKey) {
      return this._profileAuthKey;
    }

    const { token } = await this._store.get();

    if (!token?.access_token) {
      return null;
    }

    this._profileAuthKey = `oauth:${createHash('sha256').update(token.access_token).digest('hex')}`;
    return this._profileAuthKey;
  }

  async getHomey(homeyId, { usb = false } = {}) {
    const homeys = await this.getHomeys();
    const homey = homeys.find((candidate) => {
      return candidate.id === homeyId;
    });

    if (!homey) {
      throw new Error(`Homey Not Found: ${homeyId}`);
    }

    if (!usb) {
      return homey;
    }

    HomeyUsb.assertSupported(homey);
    const usbHomeys = await this.getHomeys({ usb: true });
    const usbHomey = usbHomeys.find((candidate) => {
      return candidate.id === homeyId;
    });

    if (!usbHomey) {
      throw new Error(`Homey ${homey.name} (${homey.id}) was not found over USB.`);
    }

    return usbHomey;
  }

  async getHomeys({ cache = true, usb = false } = {}) {
    if (!cache) {
      this._homeys.clear();
    }

    if (this._homeys.has(usb)) {
      return this._homeys.get(usb);
    }

    await this._initApi();

    this._user = await this.getProfile({ cache });
    const profileHomeys = await this._user.getHomeys();
    // USB metadata belongs to this process and mode, never to the cached account profile.
    let homeys = profileHomeys.map((homey) => {
      // The SDK keeps its authentication context in non-enumerable properties.
      const copy = Object.create(
        Object.getPrototypeOf(homey),
        Object.getOwnPropertyDescriptors(homey),
      );
      delete copy.usb;
      return copy;
    });

    // find USB connected Homeys
    if (usb) {
      const ifaces = os.networkInterfaces();
      const candidateIps = new Set();

      for (const adapters of Object.values(ifaces)) {
        for (const adapter of Object.values(adapters)) {
          const octets = adapter.address?.split('.') ?? [];
          if (octets.length !== 4 || octets[0] !== '10') continue;
          octets[3] = '1';
          candidateIps.add(octets.join('.'));
        }
      }

      // Probe concurrently: every candidate that is not a Homey costs the full timeout.
      const probePromises = [...candidateIps].map(async (ip) => {
        try {
          const res = await fetch(`http://${ip}/api/manager/webserver/ping`, {
            signal: AbortSignal.timeout(1000),
          });

          const homeyId = res.headers.get('x-homey-id');
          if (!homeyId) return;

          const homey = homeys.find((candidate) => {
            return (
              candidate.id === homeyId &&
              candidate.platform === 'local' &&
              candidate.apiVersion === 3
            );
          });
          if (homey) {
            homey.usb = ip;
          }
        } catch (err) {}
      });
      await Promise.all(probePromises);
      homeys = homeys.filter((homey) => {
        return Boolean(homey.usb);
      });
    }

    this._homeys.set(usb, homeys);
    return homeys;
  }

  async getActiveHomey({ usb = false } = {}) {
    if (!this._activeHomey.has(usb)) {
      let activeHomey = await Settings.get('activeHomey');
      if (activeHomey === null) {
        activeHomey = await this.selectActiveHomey({ usb });
      }

      const homey = await this.getHomey(activeHomey.id, { usb });
      const strategy = getPreferredActiveHomeyStrategy(homey);
      let homeyApi;

      try {
        if (usb) {
          homeyApi = await HomeyUsb.authenticate(homey, { api: this._api });
        } else {
          homeyApi = await homey.authenticate({ strategy });
        }
      } catch (err) {
        if (err instanceof APIErrorHomeyOffline) {
          throw new Error(
            `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same local network?`,
          );
        }
        throw err;
      }

      // Required when creating SDK client in App.js
      homeyApi.model = homey.model;

      this._activeHomey.set(usb, homeyApi);
    }

    return this._activeHomey.get(usb);
  }

  async setActiveHomey({ id, name, platform }) {
    this._activeHomey.clear();
    return await Settings.set('activeHomey', { id, name, platform });
  }

  async getSelectedHomey() {
    return Settings.get('activeHomey');
  }

  async unsetActiveHomey() {
    this._activeHomey.clear();
    return await Settings.unset('activeHomey');
  }

  async selectActiveHomey({
    id,
    name,
    usb = false,
    filter = {
      online: true,
      local: true,
    },
  } = {}) {
    const homeys = await this.getHomeys({ usb });
    let activeHomey;

    if (usb && homeys.length === 0) {
      throw new Error('No USB-connected Homey found. Check the USB connection.');
    }

    if (typeof id === 'string') {
      activeHomey = homeys.find((homey) => {
        return homey.id === id;
      });
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
              if (!usb && filter.online && homey.state && homey.state.indexOf('online') !== 0)
                return false;
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
      throw new Error(usb ? 'No matching USB-connected Homey found.' : 'No Homey found');
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
