import Manager = require("../lib/Manager");

export = ManagerApps;
/**
 * @memberof Homey
 * @namespace ManagerApps
 * @global
 */
declare class ManagerApps extends Manager {
    /**
     * Check whether an app is installed, enabled and running.
     * @param {ApiApp} appInstance
     * @returns {Promise<boolean>}
     */
    getInstalled(appInstance: any): Promise<boolean>;
    /**
     * Get an installed app's version.
     * @param {ApiApp} appInstance
     * @returns {Promise<string>}
     */
    getVersion(appInstance: any): Promise<string>;
}
