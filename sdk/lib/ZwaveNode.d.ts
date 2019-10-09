export = ZwaveNode;
declare const ZwaveNode_base: any;
/**
 * This class is a representation of a Z-Wave Device in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link ManagerZwave#getNode}.
 * @property {boolean} online - If the node is online
 * @property {Object} CommandClass - An object with {@link ZwaveCommandClass} instances
 * @hideconstructor
 */
declare class ZwaveNode extends ZwaveNode_base {
    [x: string]: any;
    constructor(opts: any, client: any);
    online: any;
    __client: any;
    CommandClass: {};
    MultiChannelNodes: {};
    /**
     * This event is fired when a battery node changed it's online or offline status.
     * @property {boolean} online - If the node is online
     * @event ZwaveNode#online
     */
    _onOnline(data: any): void;
    /**
     * This event is fired when a Node Information Frame (NIF) has been sent.
     * @property {Buffer} nif
     * @event ZwaveNode#nif
     */
    _onApplicationUpdate(data: any): void;
    /**
     * This event is fired when a a Node has received an unknown command, usually due to a missing Command Class.
     * @property {Buffer} data
     * @event ZwaveNode#unknownReport
     */
    _onUnknownApplicationCommand(data: any): void;
    _onReport(data: any): void;
    _onMultiChannelNodeEmit(multiChannelNodeId: any, event: any, args: any, callback: any): any;
    _onCommandClassEmit(commandClassId: any, event: any, args: any, callback: any): any;
}
