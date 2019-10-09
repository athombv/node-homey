import Manager = require("../lib/Manager");
import Device = require("../lib/Device");
import ZwaveNode = require("../lib/ZwaveNode");

export = ManagerZwave;
/**
 * @memberof Homey
 * @namespace ManagerZwave
 * @global
 */
declare class ManagerZwave extends Manager {
    /**
     * Get a ZwaveNode instance for a Device
     * @param {Device} device - An instance of Device
     * @returns {Promise<ZwaveNode>}
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
    getNode(device: Device): Promise<ZwaveNode>;
}
