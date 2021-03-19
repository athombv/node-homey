'use strict';

/*
	Plugin ID: log

	This plugin installs homey-log.

	Enable the plugin by adding `{ "id": "log" }` to your /.homeyplugins.json array

	Plugin options:
	{
		"version": "latest"
	}
*/

const fse = require('fs-extra');

const semver = require('semver');

const AppPlugin = require('../AppPlugin');

const NpmCommands = require('../Modules/NpmCommands');

class AppPluginLog extends AppPlugin {

  async run() {
    const appJson = await fse.readJSON(this._app._appJsonPath);

    if (appJson.sdk === 3) {
      // Check if current homey-log version is lower than 2.0.0, in that case install ^2.0.0,
      // otherwise just install homey-log as specified in package.json
      const currentHomeyLogVersion = await NpmCommands.getPackageVersion({ packageName: 'homey-log', appPath: this._app.path });
      if (currentHomeyLogVersion && semver.lt(currentHomeyLogVersion, '2.0.0')){
        return NpmCommands.install({ save: true }, {
          id: 'homey-log',
          version: '^2.0.0'
        });
      }
      return NpmCommands.install({ save: true }, {
        id: 'homey-log',
        version: this._options.version,
      });
    }
    return NpmCommands.install({ save: true }, {
      id: 'homey-log',
      version: '1.0.6',
    });
  }

}

module.exports = AppPluginLog;
