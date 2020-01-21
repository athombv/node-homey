import SimpleClass = require("./SimpleClass");

export = ZigBeeCluster;
/**
 * This class is a representation of a ZigBee Endpoint in Homey.
 * @hideconstructor
 */
declare class ZigBeeCluster extends SimpleClass {
    private constructor(cluster: any, opts: any, client: any);
    command(command: any, options?: {}): any;
    /**
     * Request to read a value of this cluster.
     * @param {Object} attr Attribute name to read
     * @returns {Promise<any>}
     */
    read(attr: any): Promise<any>;
    /**
     * Request to write a value of an attribute in this cluster.
     * @param {Object} attr Attribute name to write to
     * @param {Mixed} value Value to write
     * @returns {Promise<any>}
     */
    write(attr: any, value: any): Promise<any>;
    /**
     * Configure attribute reporting for this cluster.
     * @param {string} attr Cluster attribute that needs to be reported
     * @param {number} minInt Minimum reporting interval in seconds
     * @param {number} maxInt Maximum reporting interval in seconds
     * @param {number} [repChange] The attribute should report its value when the value is changed more than this
     * setting, for attributes with analog data type this argument is mandatory.
     * @returns {Promise<any>}
     */
    report(attr: string, minInt: number, maxInt: number, repChange?: number): Promise<any>;
    /**
     *
     * Send a command to this cluster.
     * @param {string} command Cluster command id
     * @param {Object} attr Values to send
     * @returns {Promise<any>}
     */
    do(command: string, attr: any): Promise<any>;
    /**
     * Bind to this cluster.
     * @returns {Promise<any>}
     */
    bind(): Promise<any>;
}
