export = ManagerGeolocation;
declare const ManagerGeolocation_base: any;
/**
 * @memberof Homey
 * @namespace ManagerGeolocation
 * @global
 */
declare class ManagerGeolocation extends ManagerGeolocation_base {
    [x: string]: any;
    __onInit(): any;
    _latitude: any;
    _longitude: any;
    _accuracy: any;
    _mode: any;
    /**
     * Fired when the location is updated
     * @event ManagerGeolocation#location
     */
    _onLocation(): void;
    _getLocation(): any;
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
    getMode(): string;
}
