'use strict';

const express = require('express');
const os = require('os');
const path = require('path');
const getPort = require('get-port');

const Log = require('./Log');

class WidgetServer {

  constructor(widgetId, appPath) {
    this.widgetId = widgetId;

    this.app = express();

    const widgetFolder = path.join(appPath, 'widgets', widgetId, 'public');
    this.app.use('/app/:appId/widgets/:widgetId', express.static(widgetFolder));
  }

  async start() {
    this.port = await getPort({
      port: 3001,
    });

    this.app.listen(this.port, () => {
      Log.success(`Widget server for ${this.widgetId} listening on port ${this.port}`);
    });
  }

  getLocalAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return `http://${iface.address}:${this.port}`;
        }
      }
    }

    return `http://127.0.0.1:${this.port}`;
  }

}

module.exports = WidgetServer;
