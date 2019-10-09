import BlePeripheral = require("./BlePeripheral");
import BleService = require("./BleService");
import BleDescriptor = require("./BleDescriptor");
import SimpleClass = require("./SimpleClass");

export = BleCharacteristic;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleService#discoverCharacteristics} or {@link BleService#getCharacteristic}.
 */
declare class BleCharacteristic extends SimpleClass {
    private constructor(config: any);
    /** Id of the characteristic assigned by Homey */
    id: string;
    /** Uuid of the characteristic */
    uuid: string;
    /** The peripheral object that is the owner of this characteristic */
    peripheral: BlePeripheral;
    /** The service object that is the owner of this characteristic */
    service: BleService;
    /** The name of the characteristic */
    name: string;
    /** The type of the characteristic */
    type: string;
    /** The properties of the characteristic */
    properties: string[];
    /** The value of the characteristic. Note this is set to the last result of ${@link BleCharacteristic#read} and is initially null */
    value: Buffer;
    /**
     * Discovers descriptors for this characteristic
     * @param descriptorsFilter list of descriptorUuids to search for
     */
    discoverDescriptors(descriptorsFilter?: string[]): Promise<BleDescriptor[]>;
    /**
     * Read the value for this characteristic
     */
    read(): Buffer;
    /**
     * Write a value to this characteristic
     * @param data The data that should be written
     */
    write(data: Buffer): Buffer;
    __createDescriptorInstance(descriptor: any): any;
}
