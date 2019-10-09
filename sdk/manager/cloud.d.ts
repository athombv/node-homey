import Manager = require("../lib/Manager");

export = ManagerCloud;
/**
 * @memberof Homey
 * @namespace ManagerCloud
 * @global
 */
declare class ManagerCloud extends Manager {
    /**
     * Generate a OAuth2 Callback
     * @param {CloudOAuth2Callback} oauth2Callback
     * @returns {Promise<void>}
     */
    generateOAuth2Callback(oauth2Callback: any): Promise<void>;
    /**
     * Register a webhook
     * @param {CloudWebhook} webhook
     * @returns {Promise<any>}
     */
    registerWebhook(webhook: any): Promise<any>;
    /**
     * Unregister a webhook
     * @param {CloudWebhook} webhook
     * @returns {Promise<any>}
     */
    unregisterWebhook(webhook: any): Promise<any>;
    /**
     * Get Homey's local address & port
     * @returns {Promise<string>} A promise that resolves to the local address
     */
    getLocalAddress(): Promise<string>;
    /**
     * Get Homey's Cloud ID
     * @returns {Promise<string>} A promise that resolves to the cloud id
     */
    getHomeyId(): Promise<string>;
}
