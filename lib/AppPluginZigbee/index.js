'use strict';

/*
	Plugin ID: zigbee

	This plugin installs homey-meshdriver.

	Enable the plugin by adding `{ "id": "zigbee" }` to your /.homeyplugins.json array

	Plugin options:
	{
		"version": "latest"
	}
*/

const path = require('path');

const fse = require('fs-extra');

const AppPlugin = require('../AppPlugin');

const NpmCommands = require('../Modules/NpmCommands');

class AppPluginZigbee extends AppPlugin {

	async run() {
    const appJson = await fse.readJSON(this._app._appJsonPath);
    if (appJson.sdk === 3) {
      return NpmCommands.install({ save: true }, { id: 'homey-zigbeedriver' })
        .then(() => {
          // Check if homey-zigbeedriver has zigbee-clusters as peerDependency listed, in that
          // case install the peerDependency's version
          const zigbeeClustersPeerDepVersion = this.getPeerDependencyVersion('homey-zigbeedriver', 'zigbee-clusters')
          if (typeof zigbeeClustersPeerDepVersion === 'string') {
            return NpmCommands.install({ save: true }, {
              id: 'zigbee-clusters',
              version: zigbeeClustersPeerDepVersion,
            });
          }
        });
    }
    return NpmCommands.install({ save: true }, {
      id: 'homey-meshdriver',
      version: this._options.version,
    });
	}

  /**
   * Returns version of listed peer dependency
   * @param peerDependency
   * @returns {null|string}
   */
	getPeerDependencyVersion(packageName, peerDependency) {
    try {
      return require( path.join( this._app.path, 'node_modules', packageName, 'package.json' )).peerDependencies[peerDependency];
    } catch (error) {
      return null; // package probably not installed
    }
  }

	static createDriverQuestions() {
		return [
			{
				type: 'confirm',
				name: 'isZigbee',
				default: false,
				message: 'Is this a Zigbee device?',
				when: answers => !answers.isZwave,
			}
		]
	}

	static async createDriver({ app, driverPath, answers, driverJson }) {
		await app.addPlugin('zigbee');
    await NpmCommands.install({ save: true }, {
      id: 'homey-meshdriver',
    });

		await fse.copy(
			path.join(app.path, 'node_modules', 'homey-meshdriver', 'assets', 'driver', 'zigbee', 'device.js'),
			path.join(driverPath, 'device.js')
		);
		await fse.remove(
			path.join(driverPath, 'driver.js')
		);
	}

}

module.exports = AppPluginZigbee;
