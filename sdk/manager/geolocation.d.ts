import Manager = require("../lib/Manager");

export = ManagerGeolocation;
/**
 * @memberof Homey
 * @namespace ManagerGeolocation
 * @global
 */
declare class ManagerGeolocation extends Manager {
    /**
     * Fired when the location is updated
     * @event ManagerGeolocation#location
     */
    /**
     * Get the Homey's physical location's latitude
     * @returns {number} latitude
     */
    getLatitude(): number;
    /**
     * Get the Homey's physical location's longitude
     * @returns {number} longitude
     */
    getLongitude(): number;
    /**
     * Get the Homey's physical location's accuracy
     * @returns {number} accuracy (in meter)
     */
    getAccuracy(): number;
    /**
     * Get the Homey's physical mode
     * @returns {string} `auto` or `manual`
     */
    getMode(): "auto" | "manual";
}
