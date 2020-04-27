import Manager = require("../lib/Manager");

export = ManagerApi;
/**
 * @memberof Homey
 * @namespace ManagerApi
 * @global
 */
declare class ManagerApi extends Manager {
    /**
     * Perform a GET request.
     * @param {string} path - The full path of the request, relative to /api.
     * @returns {Promise<any>}
     */
    get(path: string): Promise<any>;
    /**
     * Perform a POST request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @returns {Promise<any>}
     */
    post(path: string, body: any): Promise<any>;
    /**
     * Perform a PUT request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @returns {Promise<any>}
     */
    put(path: string, body: any): Promise<any>;
    /**
     * Perform a DELETE request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @returns {Promise<any>}
     */
    delete(path: string): Promise<any>;
    /**
     * Emit a `realtime` event.
     * @param {string} event - The name of the event
     * @param {*} [data] - The data of the event
     */
    realtime(event: string, data?: any): any;
    /**
     * Get an Api instance.
     * @param {string} uri
     * @returns Api
     */
    getApi(uri: string): any;
    /**
     * Register an {@link Api} instance, to receive realtime events.
     * @param {Api} api
     * @returns Api
     */
    registerApi(api: any): any;
    /**
     * Unregister an {@link Api} instance.
     * @param {Api} api
     */
    unregisterApi(api: any): void;
    /**
     * Starts a new API session on behalf of the homey owner and returns the API token.
     * The API Token expires after not being used for two weeks.
     * Requires the homey:manager:api permission
     * @returns {Promise<string>}
     */
    getOwnerApiToken(): Promise<string>;
    /**
     * Returns the url for local access.
     * Requires the homey:manager:api permission
     * @returns {Promise<string>}
     */
    getLocalUrl(): Promise<string>;
}
