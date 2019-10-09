export = ManagerApps;
declare const ManagerApps_base: any;
/**
 * @memberof Homey
 * @namespace ManagerApps
 * @global
 */
declare class ManagerApps extends ManagerApps_base {
    [x: string]: any;
    __onInit(): void;
    _onEvent(data: any): void;
    /**
     * Check whether an app is installed, enabled and running.
     * @param {ApiApp} appInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {boolean} callback.installed
     * @returns {Promise}
     */
    getInstalled(appInstance: any, callback?: Function): Promise<any>;
    /**
     * Get an installed app's version.
     * @param {ApiApp} appInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {string} callback.version
     * @returns {Promise}
     */
    getVersion(appInstance: any, callback?: Function): Promise<any>;
}
