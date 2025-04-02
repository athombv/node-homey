/**
 * This module is created to write shared code for the Homey CLI App instances (for every runtime).
 *
 * Methods that might be runtime specific in the future (but are currently not), are kept in the separate App instances.
 * e.g. addGitHubWorkflows
 */

'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

const Log = require('./Log');

class AppProject {

  static hasHomeyCompose({ appPath }) {
    const hasComposeFolder = fs.existsSync(path.join(appPath, '.homeycompose'));

    if (
      hasComposeFolder
      && !this.__warnedAboutMissingHomeyComposeManifest
      && !fs.existsSync(path.join(appPath, '.homeycompose/app.json'))
    ) {
      Log.warning('Warning: Could not find a Homey Compose app.json manifest!');
      Log.warning('Using the generated app.json in the root of your app is supported for now,');
      Log.warning('but it is recommended to move your manifest to .homeycompose/app.json');
      this.__warnedAboutMissingHomeyComposeManifest = true;
    }

    return hasComposeFolder;
  }

  static getManifest({ appPath }) {
    try {
      const manifestPath = path.join(appPath, 'app.json');
      const manifest = fse.readJSONSync(manifestPath);

      if (
        Object.prototype.hasOwnProperty.call(manifest, 'id') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'version') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'compatibility') === false
        || Object.prototype.hasOwnProperty.call(manifest, 'name') === false) {
        throw new Error('Found \'app.json\' file does not contain the required properties for a valid Homey app!');
      }

      return manifest;
    } catch (error) {
      throw new Error(`Could not find a valid Homey App at '${appPath}':\n${error.message}`);
    }
  }

  static getComposeManifest({ appPath }) {
    return AppProject.getManifest({ appPath: path.join(appPath, '.homeycompose') });
  }

}

module.exports = AppProject;
