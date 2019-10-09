export = ManagerCloud;
declare const ManagerCloud_base: any;
/**
 * @memberof Homey
 * @namespace ManagerCloud
 * @global
 */
declare class ManagerCloud extends ManagerCloud_base {
    [x: string]: any;
    __onInit(): void;
    _webhooks: {};
    _oauth2Callbacks: {};
    _onOAuth2CallbackCode(data: any): void;
    _onWebhooksMessage(data: any): void;
    /**
     * Generate a OAuth2 Callback
     * @param {CloudOAuth2Callback} oauth2Callback
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    generateOAuth2Callback(oauth2Callback: any, callback?: any, ...args: any[]): Promise<any>;
    /**
     * Register a webhook
     * @param {CloudWebhook} webhook
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    registerWebhook(webhook: any, callback?: any): Promise<any>;
    /**
     * Unregister a webhook
     * @param {CloudWebhook} webhook
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterWebhook(webhook: any, callback?: any): Promise<any>;
    /**
     * @callback ManagerCloud#getLocalAddressCallback
     * @param {Error} err
     * @param {string} localAddress
     */
    /**
     * Get Homey's local address & port
     * @param {ManagerCloud#getLocalAddressCallback} [callback]
     * @returns {Promise}
     */
    getLocalAddress(callback: any): Promise<any>;
    /**
     * @callback ManagerCloud#getHomeyIdCallback
     * @param {Error} err
     * @param {string} cloudId
     */
    /**
     * Get Homey's Cloud ID
     * @param {ManagerCloud#getHomeyIdCallback} [callback]
     * @returns {Promise}
     */
    getHomeyId(callback: any): Promise<any>;
}
