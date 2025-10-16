'use strict';

const path = require('path');
const os = require('os');

const inquirer = require('inquirer');
const colors = require('colors');
const _ = require('underscore');
const fetch = require('node-fetch');
const express = require('express');
const open = require('open');
const {
  AthomCloudAPI,
  HomeyAPI,
  APIErrorHomeyOffline,
} = require('homey-api');
const AthomCloudAPIToken = require('homey-api/lib/AthomCloudAPI/Token');

const AthomApiStorage = require('./AthomApiStorage');
const Log = require('./Log');
const Settings = require('../services/Settings');
const {
  ATHOM_API_CLIENT_ID,
  ATHOM_API_CLIENT_SECRET,
  ATHOM_API_LOGIN_URL,
} = require('../config');

class AthomApi {

  constructor() {
    this._api = null;
    this._user = null;
    this._homeys = null;
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
    if (!await this._api.isLoggedIn()) {
      await this.login();
    }

    return this._api;
  }

  async login() {
    Log.success('Logging in...');
    let listener;

    this._createApi();

    const app = express();
    const port = await new Promise(resolve => {
      listener = app.listen(() => {
        resolve(listener.address().port);
      });
    });

    const url = `${ATHOM_API_LOGIN_URL}?port=${port}&clientId=${ATHOM_API_CLIENT_ID}`;
    Log(colors.bold('To log in with your Athom Account, please visit', colors.underline.cyan(url)));
    open(url).catch(err => { });

    const code = await Promise.race([

      // Input code automatically by webserver
      Promise.resolve().then(async () => {
        const codePromise = new Promise(resolve => {
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
      inquirer.prompt([
        {
          type: 'text',
          name: 'receivedCode',
          message: 'Paste the code:',
        },
      ]).then(({ receivedCode }) => {
        if (!receivedCode) {
          throw new Error('Invalid code!');
        }
        return receivedCode;
      }),

      new Promise((resolve, reject) => {
        setTimeout(() => {
          Log('');
          reject(new Error('Timeout getting authorization code!'));
        }, 1000 * 60 * 5); // 5 minutes
      }),
    ]);

    listener.close();

    await this._api.authenticateWithAuthorizationCode({ code });

    try {
      const profile = await this.getProfile();

      Log.success(`You are now logged in as ${profile.firstname} ${profile.lastname} <${profile.email}>`);
    } catch (err) {
      Log.error(`Invalid Account Token, please try again:${err.stack}`);
    }
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

  async getHomeys({
    cache = true,
    local = true,
  } = {}) {
    if (cache && this._homeys) return this._homeys;

    await this._initApi();

    this._user = this._user || await this.getProfile();
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
              timeout: 1000,
            });

            const homeyId = res.headers.get('x-homey-id');
            if (!homeyId) continue;

            const homey = _.findWhere(this._homeys, { id: homeyId });
            if (homey) {
              homey.usb = ip;
            }
          } catch (err) { }
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
      const homeyApi = await homey.authenticate({
        strategy: homey.platform === HomeyAPI.PLATFORMS.CLOUD
          ? [
            HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
          ]
          : [
            HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
            HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
            HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
          ],
      }).catch(err => {
        if (err instanceof APIErrorHomeyOffline) {
          throw new Error(`${homey.name} (${homey.id}) seems to be offline. Are you sure you're in the same LAN network?`);
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

  async setActiveHomey({ id, name }) {
    return Settings.set('activeHomey', { id, name });
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
      activeHomey = _.findWhere(homeys, { _id: id });
    } else if (typeof name === 'string') {
      activeHomey = _.findWhere(homeys, { name });
    } else {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'homey',
          message: 'Choose an active Homey:',
          choices: homeys
            .filter(homey => {
              if (filter.online && homey.state && homey.state.indexOf('online') !== 0) return false;
              return true;
            })
            .map(homey => ({
              value: {
                name: homey.name,
                id: homey.id,
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
