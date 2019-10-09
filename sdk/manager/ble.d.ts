import Manager = require("../lib/Manager");
import BleAdvertisement = require("../lib/BleAdvertisement");

export = ManagerBLE;
/**
 * @memberof Homey
 * @namespace ManagerBLE
 * @global
 */
declare class ManagerBLE extends Manager {
    /**
     * Discovers BLE peripherals for a certain time
     * @param {string[]} [serviceFilter] - List of required serviceUuids the peripheral should expose
     * @param {number} [timeout=10000] - Time in ms to search for Ble peripherals (max 30 seconds)
     * @returns {BleAdvertisement[]}
     */
    discover(serviceFilter?: string[], timeout?: number): BleAdvertisement[];
    /**
     * Finds a Ble peripheral with a given peripheralUuid
     * @param {string} peripheralUuid - The uuid of the peripheral to find
     * @param {number} [timeout=10000] - Time in ms to search for the Ble peripheral (max 30 seconds)
     * @returns {BleAdvertisement}
     */
    find(peripheralUuid: string, timeout?: number): BleAdvertisement;
}
