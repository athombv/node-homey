/// <reference types="node" />
export = Api;
declare const Api_base: typeof import("events").EventEmitter;
/**
 * This class represents an API endpoint on Homey. When registered, realtime events are fired on the instance.
 * @param {string} uri - The URI of the endpoint, e.g. `homey:manager:webserver`
 */
declare class Api extends Api_base {
    constructor(uri: string);
    /**
     * Perform a GET request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @returns {Promise<any>}
     */
    get(path: string): Promise<any>;
    /**
     * Perform a POST request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {*} body - The body of the request.
     * @returns {Promise<any>}
     */
    post(path: string, body: any): Promise<any>;
    /**
     * Perform a PUT request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @param {*} body - The body of the request.
     * @returns {Promise<any>}
     */
    put(path: string, body: any): Promise<any>;
    /**
     * Perform a DELETE request.
     * @param {string} path - The path of the request, relative to the endpoint.
     * @returns {Promise<any>}
     */
    delete(path: string): Promise<any>;
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
