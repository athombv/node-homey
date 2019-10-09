import Manager = require("../lib/Manager");

export = ManagerArp;
/**
 * @memberof Homey
 * @namespace ManagerArp
 * @global
 */
declare class ManagerArp extends Manager {
    /**
     * Get an ip's MAC address
     * @param {string} ip
     * @returns {Promise<string>}
     */
    getMAC(ip: string): Promise<string>;
}
