export = ZigBeeNode;
declare const ZigBeeNode_base: any;
/**
 * This class is a representation of a ZigBee Device in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link ManagerZigBee#getNode}.
 * @hideconstructor
 */
declare class ZigBeeNode extends ZigBeeNode_base {
    [x: string]: any;
    constructor(opts: any, client: any);
    __client: any;
    status: any;
    battery: any;
    endpoints: any[];
    _onEndpointEmit(endpoint: any, event: any, data: any, callback: any): any;
}
