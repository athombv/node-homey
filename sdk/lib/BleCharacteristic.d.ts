export = BleCharacteristic;
declare const BleCharacteristic_base: any;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleService#discoverCharacteristics} or {@link BleService#getCharacteristic}.
 * @property {string} id - Id of the characteristic assigned by Homey
 * @property {string} uuid - Uuid of the characteristic
 * @property {BlePeripheral} peripheral - The peripheral object that is the owner of this characteristic
 * @property {BleService} service - The service object that is the owner of this characteristic
 * @property {string} name - The name of the characteristic
 * @property {string} type - The type of the characteristic
 * @property {string[]} properties - The properties of the characteristic
 * @property {Buffer} value - The value of the characteristic. Note this is set to the last result of ${@link BleCharacteristic#read} and is initially null
 */
declare class BleCharacteristic extends BleCharacteristic_base {
    [x: string]: any;
    constructor(config: any);
    __client: any;
    peripheral: any;
    service: any;
    id: any;
    uuid: any;
    name: any;
    type: any;
    properties: any;
    value: any;
    descriptors: any;
    /**
     * Discovers descriptors for this characteristic
     * @param {string[]} [descriptorsFilter] list of descriptorUuids to search for
     * @returns {BleDescriptor[]}
     */
    discoverDescriptors(descriptorsFilter?: string[]): any[];
    /**
     * Read the value for this characteristic
     * @returns {Buffer}
     */
    read(): any;
    /**
     * Write a value to this characteristic
     * @param {Buffer} data The data that should be written
     * @returns {Buffer}
     */
    write(data: any): any;
    getInfoString(): Promise<void>;
    __createDescriptorInstance(descriptor: any): any;
}
