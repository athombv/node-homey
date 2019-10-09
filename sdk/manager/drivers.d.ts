import Manager = require("../lib/Manager");
import Driver = require("../lib/Driver");

export = ManagerDrivers;
/**
 * @memberof Homey
 * @namespace ManagerDrivers
 * @global
 */
declare class ManagerDrivers extends Manager {
    /**
     * Get a Driver instance by its ID
     * @param driverId {string} ID of the driver, as defined in app.json
     * @returns {Driver|Error} Driver
     */
    getDriver(driverId: string): Driver | Error;
    /**
     * Get an object with all {@link Driver} instances, with their ID as key
     * @returns {Record<string, Driver>} Drivers
     */
    getDrivers(): Record<string, Driver>;
}
