import SimpleClass = require("./SimpleClass");

export = BleAdvertisement;
/**
 * This class is a representation of a BLE Advertisement for a {@link BlePeripheral} in Homey.
 * This class must not be initiated by the developer, but retrieved by calling {@link ManagerBle#discover} or {@link ManagerBle#find}.
 */
declare class BleAdvertisement extends SimpleClass {
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
    /** The local name of the peripheral */
    localName: string; 
    /** Manufacturer specific data for peripheral */
    manufacturerData: string; 
    /** Array of service data entries */
    serviceData: string[]; 
    /** Array of service uuids */
    serviceUuids: string[]; 
    /** The rssi signal strength value for the peripheral */
    rssi: number; 

    /**
     * Connect to the BLE peripheral this advertisement references
     * @returns {BlePeripheral}
     */
    connect(): any;
}
