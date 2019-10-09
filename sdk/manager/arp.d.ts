export = ManagerArp;
declare const ManagerArp_base: any;
/**
 * @memberof Homey
 * @namespace ManagerArp
 * @global
 */
declare class ManagerArp extends ManagerArp_base {
    [x: string]: any;
    /**
     * Get an ip's MAC address
     * @param {string} ip
     * @param {Function} callback
     * @param {Error} callback.err
     * @param {string} callback.mac
     * @returns Promise
     */
    getMAC(ip: string, callback: Function): any;
}
