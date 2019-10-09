export = ManagerApi;
declare const ManagerApi_base: any;
/**
 * @memberof Homey
 * @namespace ManagerApi
 * @global
 */
declare class ManagerApi extends ManagerApi_base {
    [x: string]: any;
    __onInit(): void;
    _endpoints: any;
    _apis: {};
    _onRest(data: any, callback: any): void;
    _onRealtime(data: any): void;
    _call(method: any, path: any, body: any, callback: any, ...args: any[]): any;
    /**
     * Perform a GET request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    get(path: string, callback?: any): any;
    /**
     * Perform a POST request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    post(path: string, body: any, callback?: any): any;
    /**
     * Perform a PUT request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    put(path: string, body: any, callback?: any): any;
    /**
     * Perform a DELETE request.
     * @param {string} path - The full path of the request, relative to /api.
     * @param {*} body - The body of the request.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    delete(path: string, callback?: any): any;
    /**
     * Emit a `realtime` event.
     * @param {string} event - The name of the event
     * @param {*} data - The data of the event
     */
    realtime(event: string, data: any): any;
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
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    getOwnerApiToken(callback?: any, ...args: any[]): any;
    /**
     * Returns the url for local access.
     * Requires the homey:manager:api permission
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    getLocalUrl(callback?: any, ...args: any[]): any;
}
