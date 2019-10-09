export = ZigBeeEndpoint;
declare const ZigBeeEndpoint_base: any;
/**
 * This class is a representation of a ZigBee Endpoint in Homey.
 * @hideconstructor
 */
declare class ZigBeeEndpoint extends ZigBeeEndpoint_base {
    [x: string]: any;
    constructor(endpoint: any, opts: any, client: any);
    endpoint: any;
    __client: any;
    clusters: {};
    _onClusterEmit(cluster: any, event: any, data: any, callback: any): any;
}
