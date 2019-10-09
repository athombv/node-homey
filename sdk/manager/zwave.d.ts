export = ManagerZwave;
declare const ManagerZwave_base: any;
/**
 * @memberof Homey
 * @namespace ManagerZwave
 * @global
 */
declare class ManagerZwave extends ManagerZwave_base {
    [x: string]: any;
    __onInit(): void;
    _nodes: {};
    _onEvent(data: any): void;
    _onNodeEmit(token: any, event: any, args: any, callback: any): any;
    /**
     * Get a ZwaveNode instance for a Device
     * @param {Device} device - An instance of Device
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {ZwaveNode} callback.node
     * @returns {Promise}
     * @example
     * const Homey = require('homey');
     * class MyZwaveDevice extends Homey.Device {
       *
       *   onInit() {
       *
       *     Homey.ManagerZwave.getNode( this )
       *       .then( node => {
       *
       *         node.CommandClass['COMMAND_CLASS_BASIC'].on('report', ( command, report ) => {
       *           this.log('onReport', command, report);
       *         })
       *
       *         node.CommandClass['COMMAND_CLASS_BASIC'].BASIC_SET({
       *           'Value': 0xFF
       *         })
       *           .then( this.log )
       *           .catch( this.error )
       *       })
       *       .catch( this.error );
       *   }
       *
       * }
     */
    getNode(device: any, callback?: Function, ...args: any[]): Promise<any>;
}
