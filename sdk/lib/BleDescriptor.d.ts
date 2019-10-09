import BlePeripheral = require("./BlePeripheral");
import BleService = require("./BleService");
import BleCharacteristic = require("./BleCharacteristic");
import SimpleClass = require("./SimpleClass");

export = BleDescriptor;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link BleCharacteristic#discoverDescriptors}.
 */
declare class BleDescriptor extends SimpleClass {
    private constructor(config: any);
    /** Id of the characteristic assigned by Homey */
    id: string;
    /** Uuid of the characteristic */
    uuid: string;
    /** The peripheral object that is the owner of this descriptor */
    peripheral: BlePeripheral;
    /** The service object that is the owner of this descriptor */
    service: BleService;
    /** The characteristic object that is the owner of this descriptor */
    characteristic: BleCharacteristic;
    /** The name of the descriptor */
    name: string;
    /** The type of the descriptor */
    type: string;
    /** The value of the descriptor. Note this is set to the last result of ${@link BleDescriptor#read} and is initially null */
    value: Buffer;
    /**
     * Read the value for this descriptor
     */
    readValue(): Promise<Buffer>;
    /**
     * Write a value to this descriptor
     * @param data The data that should be written
     */
    writeValue(data: Buffer): Promise<Buffer>;
}
