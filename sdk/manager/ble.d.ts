export = ManagerBLE;
declare const ManagerBLE_base: any;
/**
 * @memberof Homey
 * @namespace ManagerBLE
 * @global
 */
declare class ManagerBLE extends ManagerBLE_base {
    [x: string]: any;
    __onInit(): void;
    __advertisementsByPeripheralUUID: {};
    /**
     * Discovers BLE peripherals for a certain time
     * @param {string[]} [serviceFilter] - List of required serviceUuids the peripheral should expose
     * @param {number} [timeout=10000] - Time in ms to search for Ble peripherals (max 30 seconds)
     * @returns {BleAdvertisement[]}
     */
    discover(serviceFilter?: string[], timeout?: number): any[];
    /**
     * Finds a Ble peripheral with a given peripheralUuid
     * @param {string} peripheralUuid - The uuid of the peripheral to find
     * @param {number} [timeout=10000] - Time in ms to search for the Ble peripheral (max 30 seconds)
     * @returns {BleAdvertisement}
     */
    find(peripheralUuid: string, timeout?: number): any;
    __createAdvertisementInstance(advertisement: any): any;
}
