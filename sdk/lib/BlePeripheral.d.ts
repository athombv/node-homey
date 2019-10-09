import BleService = require("./BleService");
import SimpleClass = require("./SimpleClass");

export = BlePeripheral;

type BlePeripheralAdvertisement = {
    /** The local name of the peripheral */
    localName: string;
    /** Manufacturer specific data for peripheral */
    manufacturerData: string;
    /** Array of service data entries */
    serviceData: string[];
    /** Array of service uuids */
    serviceUuids: string[];
}

/**
 * This class is a representation of a BLE peripheral in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleAdvertisement#connect}.
 
 */
declare class BlePeripheral extends SimpleClass {
    private constructor(config: any);
    /** Id of the peripheral assigned by Homey */
    id: string;
    /** Uuid of the peripheral */
    uuid: string;
    /** The mac address of the peripheral */
    address: string;
    /** The address type of the peripheral */
    addressType: string;
    /** Indicates if Homey can connect to the peripheral */
    connectable: boolean;
    /** The rssi signal strength value for the peripheral */
    rssi: number;
    /** The state of the peripheral */
    state: string;
    /** Array of services of the peripheral. Note that this array is only filled after the service is discovered by {BleAdvertisement#discoverServices} or {BleAdvertisement#discoverService} */
    services: BleService[];
    /** Advertisement data of the peripheral */
    advertisement: BlePeripheralAdvertisement;
 
    /** If the peripheral is currently connected to Homey */
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
    /**
     * Disconnect Homey from the peripheral
     * @returns {Promise}
     */
    disconnect(): Promise<any>;
    /**
     * Updates the RSSI signal strength value
     * @returns {string} rssi
     */
    updateRssi(): Promise<string>;
    /**
     * Discovers the services of the peripheral
     * @param {string[]} [servicesFilter] list of services to discover, if not given all services will be discovered
     * @returns {Promise<BleService[]>}
     */
    discoverServices(servicesFilter?: string[]): Promise<BleService[]>;
    /**
     * Discovers all services and characteristics of the peripheral
     * @returns {Promise<BleService[]>}
     */
    discoverAllServicesAndCharacteristics(): Promise<BleService[]>;
    /**
     * Get a service with the given uuid
     * @param {string} uuid The uuid of the service
     * @returns {Promise<BleService>}
     */
    getService(uuid: string): Promise<BleService>;
    /**
     * Shorthand to read a characteristic for given serviceUuid and characteristicUuid
     * @param {string} serviceUuid The uuid of the service that has given characteristic
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be read
     * @returns {Promise<Buffer>}
     */
    read(serviceUuid: string, characteristicUuid: string): Promise<Buffer>;
    /**
     * Shorthand to write to a characteristic for given serviceUuid and characteristicUuid
     * @param {string} serviceUuid The uuid of the service that has given characteristic
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be written to
     * @param {Buffer} data The data that needs to be written
     * @returns {Promise<Buffer>}
     */
    write(serviceUuid: string, characteristicUuid: string, data: Buffer): Promise<Buffer>;
}
