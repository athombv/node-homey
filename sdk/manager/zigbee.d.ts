import Manager = require("../lib/Manager");
import ZigBeeNode = require("../lib/ZigBeeNode");
import Device = require("../lib/Device");

export = ManagerZigBee;
/**
 * @memberof Homey
 * @namespace ManagerZigBee
 * @global
 */
declare class ManagerZigBee extends Manager {
    /**
     * Get a ZigBeeNode instance for a Device
     * @param {Device} device - An instance of Device
     * @returns {Promise<ZigBeeNode>}
     */
    getNode(device: Device): Promise<ZigBeeNode>;
}
