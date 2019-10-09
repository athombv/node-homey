import SimpleClass = require("./SimpleClass");

export = ZigBeeNode;
/**
 * This class is a representation of a ZigBee Device in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link ManagerZigBee#getNode}.
 * @hideconstructor
 */
declare class ZigBeeNode extends SimpleClass {
    private constructor(opts: any, client: any);
    status: any;
    battery: any;
    endpoints: any[];
}
