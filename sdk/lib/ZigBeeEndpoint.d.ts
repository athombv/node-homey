import SimpleClass = require("./SimpleClass");

export = ZigBeeEndpoint;
/**
 * This class is a representation of a ZigBee Endpoint in Homey.
 * @hideconstructor
 */
declare class ZigBeeEndpoint extends SimpleClass {
    private constructor(endpoint: any, opts: any, client: any);
}
