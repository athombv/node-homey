export = BleAdvertisement;
declare const BleAdvertisement_base: any;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link ManagerBle#discover} or {@link ManagerBle#find}.
 * @property {string} id - Id of the peripheral assigned by Homey
 * @property {string} uuid - Uuid of the peripheral
 * @property {string} address - The mac address of the peripheral
 * @property {string} addressType - The address type of the peripheral
 * @property {boolean} connectable - Indicates if Homey can connect to the peripheral
 * @property {string} localName - The local name of the peripheral
 * @property {string} manufacturerData - Manufacturer specific data for peripheral
 * @property {string[]} serviceData - Array of service data entries
 * @property {string[]} serviceUuids - Array of service uuids
 * @property {number} rssi - The rssi signal strength value for the peripheral
 */
declare class BleAdvertisement extends BleAdvertisement_base {
    [x: string]: any;
    constructor(config: any);
    __peripheral: any;
    __client: any;
    id: any;
    uuid: any;
    address: any;
    addressType: any;
    connectable: any;
    localName: any;
    manufacturerData: any;
    serviceData: any;
    serviceUuids: any;
    rssi: any;
    /**
     * Connect to the BLE peripheral this advertisement references
     * @returns {BlePeripheral}
     */
    connect(): any;
    printInfo(): Promise<void>;
}
