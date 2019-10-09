export = Api;
declare const Api_base: any;
/**
 * This class represents an API endpoint on Homey. When registered, realtime events are fired on the instance.
 * @param {string} uri - The URI of the endpoint, e.g. `homey:manager:webserver`
 */
declare class Api extends Api_base {
    [x: string]: any;
    constructor(uri: any);
    uri: any;
    type: any;
    id: any;
    _call(method: any, path: any, body: any, callback: any): any;
    /**
     * Perform a GET request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    get(path: string, callback?: any): any;
    /**
     * Perform a POST request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {*} body - The body of the request.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    post(path: string, body: any, callback?: any): any;
    /**
     * Perform a PUT request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {*} body - The body of the request.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    put(path: string, body: any, callback?: any): any;
    /**
     * Perform a DELETE request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    delete(path: string, callback?: any): any;
    /**
     * Register the API, to receive incoming realtime events.
     * This is a shorthand method for {@link ManagerApi#registerApi}.
     * @returns {Api}
     */
    register(): Api;
    /**
     * Unregister the API.
     * This is a shorthand method for {@link ManagerApi#unregisterApi}.
     */
    unregister(): any;
}
