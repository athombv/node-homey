export = ManagerDrivers;
declare const ManagerDrivers_base: any;
/**
 * @memberof Homey
 * @namespace ManagerDrivers
 * @global
 */
declare class ManagerDrivers extends ManagerDrivers_base {
    [x: string]: any;
    __onInit(): void;
    _drivers: {};
    _pairSockets: {};
    _onEventDriverInit({ driverId, devices }: {
        driverId: any;
        devices: any;
    }, callback: any): any;
    _onEventDriverMessage(data: any, callback: any): void;
    _onEventDriverPairStart(data: any, callback: any): void;
    _onEventDriverPairMessage(data: any, callback: any): void;
    _getPairSocket(token: any): any;
    _onDriverEmit(driverId: any, event: any, opts: any, callback: any): any;
    /**
     * Get a Driver instance by its ID
     * @param driverId {string} ID of the driver, as defined in app.json
     * @returns {Driver} Driver
     */
    getDriver(driverId: string): any;
    /**
     * Get an object with all {@link Driver} instances, with their ID as key
     * @returns {Object} Drivers
     */
    getDrivers(): any;
}
