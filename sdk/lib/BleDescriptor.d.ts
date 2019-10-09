export = BleDescriptor;
declare const BleDescriptor_base: any;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleCharacteristic#discoverDescriptors}.
 * @property {string} id - Id of the characteristic assigned by Homey
 * @property {string} uuid - Uuid of the characteristic
 * @property {BlePeripheral} peripheral - The peripheral object that is the owner of this descriptor
 * @property {BleService} service - The service object that is the owner of this descriptor
 * @property {BleCharacteristic} characteristic - The characteristic object that is the owner of this descriptor
 * @property {string} name - The name of the descriptor
 * @property {string} type - The type of the descriptor
 * @property {Buffer} value - The value of the descriptor. Note this is set to the last result of ${@link BleDescriptor#read} and is initially null
 */
declare class BleDescriptor extends BleDescriptor_base {
    [x: string]: any;
    constructor(config: any);
    __client: any;
    peripheral: any;
    service: any;
    characteristic: any;
    id: any;
    uuid: any;
    name: any;
    type: any;
    value: any;
    /**
     * Read the value for this descriptor
     * @returns {Buffer}
     */
    readValue(): any;
    /**
     * Write a value to this descriptor
     * @param {Buffer} data The data that should be written
     * @returns {Buffer}
     */
    writeValue(data: any): any;
    getInfoString(): Promise<void>;
}
