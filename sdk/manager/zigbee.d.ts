export = ManagerZigBee;
declare const ManagerZigBee_base: any;
/**
 * @memberof Homey
 * @namespace ManagerZigBee
 * @global
 */
declare class ManagerZigBee extends ManagerZigBee_base {
    [x: string]: any;
    __onInit(): void;
    _nodes: {};
    _onEvent(data: any): void;
    _onNodeEmit(token: any, event: any, args: any, callback: any): any;
    /**
     * Get a ZigBeeNode instance for a Device
     * @param {Device} device - An instance of Device
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {ZigBeeNode} callback.node
     * @returns {Promise}
     */
    getNode(device: any, callback?: Function, ...args: any[]): Promise<any>;
}
