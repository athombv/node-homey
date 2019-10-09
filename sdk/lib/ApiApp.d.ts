export = ApiApp;
/**
 * This class represents another App on Homey. When registered, realtime events are fired on the instance.
 * @param {string} appId - The ID of the App, e.g. `com.athom.foo`
 * @extends Api
 * @example
 * const Homey = require('homey');
 * let otherApp = new Homey.ApiApp('com.athom.otherApp');
 *     otherApp
 *         .register()
 *         .on('realtime', this.log.bind(this, 'otherApp.onRealtime'))
 *         .on('install', this.log.bind(this, 'otherApp.onInstall'))
 *         .on('uninstall', this.log.bind(this, 'otherApp.onUninstall'))
 *         .get('/')
 *             .then( this.log.bind( this, 'otherApp.get') )
 *             .catch( this.error.bind( this, 'otherApp.get') )
 *
 *     otherApp.getInstalled()
 *         .then( this.log.bind( this, 'otherApp.getInstalled') )
 *         .catch( this.error.bind( this, 'otherApp.getInstalled') )
 *
 *     otherApp.getVersion()
 *         .then( this.log.bind( this, 'otherApp.getVersion') )
 *         .catch( this.error.bind( this, 'otherApp.getVersion') )
 */
declare class ApiApp {
    constructor(appId: any);
    /**
     * This is a short-hand method to {@link ManagerApps#getInstalled}.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {boolean} callback.installed
     * @returns {Promise}
     */
    getInstalled(callback?: Function): Promise<any>;
    /**
     * This is a short-hand method to {@link ManagerApps#getVersion}.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {string} callback.version
     * @returns {Promise}
     */
    getVersion(callback?: Function): Promise<any>;
}
