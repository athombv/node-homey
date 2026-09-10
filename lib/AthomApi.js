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
    this._homeys = null;
    this._activeHomey = null;
    this.discoveryStrategies = undefined;
  }

  _createApi() {
    this._user = null;
    this._homeys = null;
    this._activeHomey = null;
    this._profileAuthKey = process.env.HOMEY_PAT
      ? createHash('sha256').update(process.env.HOMEY_PAT).digest('hex')
      : 'oauth';
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
    await this._api.authenticateWithAuthorizationCode({ code });
    this._profileAuthKey = 'oauth';
    await this._profileCache.clear();
  }

  async logout() {
    Log.success('You are now logged out');
    await this._createApi();
    await this._api.logout();
    await this._profileCache.clear();
    await this.unsetActiveHomey();
  }

  async getProfile({ cache = true } = {}) {
    await this._initApi();

    const stored = await this._profileCache.get();
    const hasCachedProfile = Boolean(stored?.user && stored.authKey === this._profileAuthKey);
    const now = Date.now();
    const isFresh = hasCachedProfile && now - stored.updatedAt < PROFILE_CACHE_TTL;
    const isCoolingDown = hasCachedProfile && now < stored.retryAfter;

    if ((cache && isFresh) || isCoolingDown) {
      return new AthomCloudAPI.User({ api: this._api, properties: stored.user });
    }

    let properties;

    try {
      properties = await this._api.call({ method: 'get', path: '/user/me' });
    } catch (err) {
      if (err.statusCode !== 429 || !hasCachedProfile) {
        throw err;
      }

      await this._profileCache.set({
        ...stored,
        retryAfter: Date.now() + PROFILE_RATE_LIMIT_COOLDOWN,
      });

      return new AthomCloudAPI.User({ api: this._api, properties: stored.user });
    }

    const profile = new AthomCloudAPI.User({ api: this._api, properties });
    await this._profileCache.set({
      user: properties,
      authKey: this._profileAuthKey,
      updatedAt: Date.now(),
    });

    return profile;
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
    if (cache && this._homeys) return this._homeys;

    await this._initApi();

    this._user = await this.getProfile({ cache });
    this._homeys = await this._user.getHomeys();

    // find USB connected Homeys
    if (local) {
      const ifaces = os.networkInterfaces();

      for (const adapters of Object.values(ifaces)) {
        for (const adapter of Object.values(adapters)) {
          try {
            let ip = adapter.address.split('.');
            if (ip[0] !== '10') continue;
            ip[3] = '1';
            ip = ip.join('.');

            const res = await fetch(`http://${ip}/api/manager/webserver/ping`, {
              signal: AbortSignal.timeout(1000),
            });

            const homeyId = res.headers.get('x-homey-id');
            if (!homeyId) continue;

            const homey = this._homeys.find((candidate) => candidate.id === homeyId);
            if (homey) {
              homey.usb = ip;
            }
          } catch (err) {}
        }
      }
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
      const strategy = this.discoveryStrategies ?? getPreferredActiveHomeyStrategy(homey);
      const homeyApi = await homey.authenticate({ strategy }).catch((err) => {
        if (err instanceof APIErrorHomeyOffline) {
          throw new Error(
            `${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same local network?`,
          );
        }
        throw err;
      });

      if (homey.usb && !this.discoveryStrategies) {
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
      activeHomey = homeys.find((homey) => homey._id === id);
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
