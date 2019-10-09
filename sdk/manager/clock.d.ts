export = ManagerClock;
declare const ManagerClock_base: any;
/**
 * @memberof Homey
 * @namespace ManagerClock
 * @global
 * @since 1.5.10
*/
declare class ManagerClock extends ManagerClock_base {
    [x: string]: any;
    __onInit(): void;
    /**
     * Get the current TimeZone
     * @returns {String}
     */
    getTimezone(): string;
}
