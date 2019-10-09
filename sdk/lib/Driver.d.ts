import SimpleClass = require("./SimpleClass");
import DiscoveryStrategy = require("./DiscoveryStrategy");
import Device = require("./Device");

type Callback = (error: Error, data: any) => void;
declare class PairSocket {
    on(event: string, listener: (data: any, callback: Callback) => void): PairSocket;
    emit(event: string, data: any): Promise<any>;
    showView(viewId: string): Promise<any>;
    nextView(): Promise<any>;
    prevView(): Promise<any>;
    done(): Promise<any>;
}

export = Driver;
/**
 * The Driver class manages all Device instances, which represent all paired devices.
 * This class should be extended and exported from `driver.js`.
 * Methods prefixed with `on` are meant to be overriden.
 * It is not allowed to overwrite the constructor.
 * @tutorial Drivers
 * @property {string} id Driver ID as specified in the `/app.json`
 * @hideconstructor
 */
declare class Driver extends SimpleClass {
    /**
     * When this method exists, it will be called prior to initing the device instance. Return a class that extends {@link Device}.
     * @function Driver#onMapDeviceClass
     * @param {Device} device - A temporary Device instance to check certain properties before deciding which class the device should use. This class will exist for a single tick, and does not support async methods.
     * @example
     * class MyDriver extends Homey.Driver {
     *
     *   onMapDeviceClass( device ) {
     *     if( device.hasCapability('dim') ) {
     *       return MyDeviceDim;
     *     } else {
     *       return MyDevice;
     *     }
     *   }
     * }
     */
    static isEqualDeviceData(deviceDataA: any, deviceDataB: any): any;
    constructor(driverId: any, client: any, manifest: any);
    /**
     * Calls the callback when the Driver is ready ({@link Driver#onInit} has been run).
     */
    ready(callback: () => void): void;
    /**
     * Get an Array with all {@link Device} instances
     * @returns {Array} Devices
     */
    getDevices(): Device[];
    /**
     * Get a Device instance by its deviceData object.
     * @param {Object} deviceData Unique Device object as provided during pairing
     * @returns {Device} Device
     */
    getDevice(deviceData: any): any;
    getDeviceById(deviceAppId: any): any;
    /**
     * Gets the driver's manifest (app.json entry)
     * @returns {Object}
     */
    getManifest(): any;
    /**
     * Get the driver's discovery strategy when defined in the manifest
     * @returns {DiscoveryStrategy}
     */
    getDiscoveryStrategy(): DiscoveryStrategy;
    /**
     * This method is called when the driver is inited.
     */
    onInit(): void;
    /**
     * This method is called when a pair session starts.
     * @param {PairSocket} socket Bi-directional socket for communication with the front-end
     */
    onPair(socket: PairSocket): void;
    /**
     * This method is called when no custom onPair() method has been defined, and the default is being used.
     * Simple drivers should override this method to provide a list of devices ready to be paired.
     */
    onPairListDevices(data: any, callback: Callback): void;
}
