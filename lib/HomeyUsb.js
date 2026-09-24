'use strict';

const { HomeyAPIV3Local } = require('homey-api');

class HomeyUsb {
  static assertSupported(homey) {
    if (homey.platform !== 'local' || homey.apiVersion !== 3) {
      throw new Error(`USB requires a local API-v3 Homey: ${homey.name} (${homey.id}).`);
    }
  }

  static getAddress(homey) {
    HomeyUsb.assertSupported(homey);

    if (!homey.usb) {
      throw new Error(`Homey ${homey.name} (${homey.id}) was not found over USB.`);
    }

    return `http://${homey.usb}:80`;
  }

  static createClient(homey, { api = null, token = null } = {}) {
    const baseUrl = HomeyUsb.getAddress(homey);
    const client = new HomeyAPIV3Local({
      properties: { ...homey, id: homey.id },
      api,
      token,
      baseUrl,
      strategy: [],
    });
    client.model = homey.model;

    return client;
  }

  static async authenticate(homey, { api }) {
    const client = HomeyUsb.createClient(homey, { api });

    try {
      await client.login();
      return client;
    } catch (err) {
      client.destroy();
      throw new Error(`Could not authenticate ${homey.name} (${homey.id}) over USB.`, {
        cause: err,
      });
    }
  }
}

module.exports = { HomeyUsb };
