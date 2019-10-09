export = ZigBeeCluster;
declare const ZigBeeCluster_base: any;
/**
 * This class is a representation of a ZigBee Endpoint in Homey.
 * @hideconstructor
 */
declare class ZigBeeCluster extends ZigBeeCluster_base {
    [x: string]: any;
    constructor(cluster: any, opts: any, client: any);
    dir: any;
    attrs: any;
    cluster: any;
    __client: any;
    command(commandId: any, args: any, callback: any): any;
    /**
     * Request to read a value of this cluster.
     * @param {Object} key Value to read
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    read(key: any, callback?: any): Promise<any>;
    /**
     * Request to write a value of an attribute in this cluster.
     * @param {Object} key Attribute name to write to
     * @param {Mixed} value Value to write
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    write(key: any, value: any, callback?: any): Promise<any>;
    /**
     * Configure attribute reporting for this cluster.
     * @param {string} attr Cluster attribute that needs to be reported
     * @param {number} minInt Minimum reporting interval in seconds
     * @param {number} maxInt Maximum reporting interval in seconds
     * @param {number} [repChange] The attribute should report its value when the value is changed more than this
     * setting, for attributes with analog data type this argument is mandatory.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    report(attr: string, minInt: number, maxInt: number, repChange?: number, callback?: any): Promise<any>;
    /**
     *
     * Send a command to this cluster.
     * @param {string} command Cluster command id
     * @param {Object} attr Values to send
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    do(command: string, attr: any, callback?: any): Promise<any>;
    /**
     * Bind to this cluster.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    bind(callback?: any): Promise<any>;
}
