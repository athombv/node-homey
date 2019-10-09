export = BleService;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BlePeripheral#discoverServices} or {@link BlePeripheral#getService}.
 * @property {string} id - Id of the service assigned by Homey
 * @property {string} uuid - Uuid of the service
 * @property {BlePeripheral} peripheral - The peripheral object that is the owner of this service
 * @property {string} name - The name of the service
 * @property {string} type - The type of the service
 */
declare class BleService {
    constructor(config: any);
    __client: any;
    peripheral: any;
    id: any;
    uuid: any;
    name: any;
    type: any;
    characteristics: any;
    /**
     * Discovers included service uuids
     * @param {string[]} [includedServicesFilter] Array of included service uuids to search for
     * @returns {Promise}
     */
    discoverIncludedServices(includedServicesFilter?: string[]): Promise<any>;
    /**
     * Discover characteristics of this service
     * @param {string[]} [characteristicsFilter] List of characteristicUuids to search for
     * @returns {BleCharacteristic[]}
     */
    discoverCharacteristics(characteristicsFilter?: string[]): any[];
    /**
     * gets a characteristic for given characteristicUuid
     * @param {string} uuid The characteristicUuid to get
     * @returns {BleCharacteristic}
     */
    getCharacteristic(uuid: string): any;
    /**
     * Shorthand to read a characteristic for given characteristicUuid
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be read
     * @returns {Buffer}
     */
    read(characteristicUuid: string): any;
    readAll(): Promise<void>;
    /**
     * Shorthand to write to a characteristic for given characteristicUuid
     * @param {string} characteristicUuid The uuid of the characteristic that needs to be written to
     * @param {Buffer} data The data that needs to be written
     * @returns {Buffer}
     */
    write(characteristicUuid: string, data: any): any;
    writeAll(): Promise<void>;
    getInfoString(): void;
    __createCharacteristicInstance(characteristic: any): any;
}
