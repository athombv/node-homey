export = BlePeripheral;
declare const BlePeripheral_base: any;
/**
 * @typedef {Object} BlePeripheral#Advertisement
 * @property {string} localName - The local name of the peripheral
 * @property {string} manufacturerData - Manufacturer specific data for peripheral
 * @property {string[]} serviceData - Array of service data entries
 * @property {string[]} serviceUuids - Array of service uuids
 */
/**
 * This class is a representation of a BLE peripheral in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleAdvertisement#connect}.
 * @property {string} id - Id of the peripheral assigned by Homey
 * @property {string} uuid - Uuid of the peripheral
 * @property {string} address - The mac address of the peripheral
 * @property {string} addressType - The address type of the peripheral
 * @property {boolean} connectable - Indicates if Homey can connect to the peripheral
 * @property {number} rssi - The rssi signal strength value for the peripheral
 * @property {string} state - The state of the peripheral
 * @property {boolean} isConnected - If the peripheral is currently connected to Homey
 * @property {BleService[]} services - Array of services of the peripheral. Note that this array is only filled after the service is discovered by {BleAdvertisement#discoverServices} or {BleAdvertisement#discoverService}
 * @property {BlePeripheral#Advertisement} advertisement - Advertisement data of the peripheral
 */
declare class BlePeripheral extends BlePeripheral_base {
    [x: string]: any;
    constructor(config: any);
    __client: any;
    id: any;
    uuid: any;
    advertisement: any;
    services: any[];
    _touchConnection(): void;
    _disconnectTimeout: number;
    get isConnected(): boolean;
    /**
     * Asserts that the device is connected and if not, connects with the device.
     * @returns {Promise}
     */
    assertConnected(): Promise<any>;
    /**
     * Connects to the peripheral if Homey disconnected from it
     * @returns {BlePeripheral}
     */
    connect(): import("./BlePeripheral");
    connectionId: any;
    state: any;
    address: any;
    addressType: any;
    connectable: any;
    rssi: any;
    /**
     * Disconnect Homey from the peripheral
     * @returns {Promise}
     */
    disconnect(): Promise<any>;
    /**
     * Updates the RSSI signal strength value
     * @returns {string} rssi
     */
    updateRssi(): string;
    /**
     * Discovers the services of the peripheral
     * @param {string[]} [servicesFilter] list of services to discover, if not given all services will be discovered
     * @returns {BleService[]}
     */
    discoverServices(servicesFilter?: string[]): any[];
    /**
     * Discovers all services and characteristics of the peripheral
     * @returns {BleService[]}
     */
    discoverAllServicesAndCharacteristics(): any[];
    /**
     * Get a service with the given uuid
     * @param {string} uuid The uuid of the service
     * @returns {BleService}
     */
    getService(uuid: string): any;
    /**
     * Shorthand to read a characteristic for given serviceUuid and characteristicUuid
     * @param {string} serviceUuid The uuid of the service that has given characteristic
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be read
     * @returns {Buffer}
     */
    read(serviceUuid: string, characteristicUuid: string): any;
    readAll(): Promise<void>;
    /**
     * Shorthand to write to a characteristic for given serviceUuid and characteristicUuid
     * @param {string} serviceUuid The uuid of the service that has given characteristic
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be written to
     * @param {Buffer} data The data that needs to be written
     * @returns {Buffer}
     */
    write(serviceUuid: string, characteristicUuid: string, data: any): any;
    writeAll(): Promise<void>;
    getInfoString(): void;
    __createServiceInstance(service: any): any;
}
declare namespace BlePeripheral {
    export { BlePeripheral };
}
/**
 * #Advertisement
 */
type BlePeripheral = {
    /**
     * - The local name of the peripheral
     */
    localName: string;
    /**
     * - Manufacturer specific data for peripheral
     */
    manufacturerData: string;
    /**
     * - Array of service data entries
     */
    serviceData: string[];
    /**
     * - Array of service uuids
     */
    serviceUuids: string[];
};
