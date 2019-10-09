import Manager = require("../lib/Manager");

export = ManagerClock;
/**
 * @memberof Homey
 * @namespace ManagerClock
 * @global
 * @since 1.5.10
*/
declare class ManagerClock extends Manager {
    /**
     * Get the current TimeZone
     * @returns {string}
     */
    getTimezone(): string;
}
