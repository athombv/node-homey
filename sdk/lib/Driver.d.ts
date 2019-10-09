export = Driver;
declare const Driver_base: any;
/**
 * The Driver class manages all Device instances, which represent all paired devices.
 * This class should be extended and exported from `driver.js`.
 * Methods prefixed with `on` are meant to be overriden.
 * It is not allowed to overwrite the constructor.
 * @tutorial Drivers
 * @property {string} id Driver ID as specified in the `/app.json`
 * @hideconstructor
 */
declare class Driver extends Driver_base {
    [x: string]: any;
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
    id: any;
    __onAdded(data: any, callback: any): void;
    __onDeleted(data: any, callback: any): any;
    __onRenamed(data: any, callback: any): any;
    __onSettings(data: any, callback: any): any;
    __onCapability(data: any, callback: any): any;
    __initDevices(devices: any, callback: any): any;
    __initDevice(device: any, callback: any): void;
    __uninitDevice(device: any): void;
    __onReady(devices: any, callback: any): void;
    __onDeviceEmit(deviceAppId: any, event: any, data: any, callback: any): any;
    __setDiscoveryStrategy(strategyId: any): void;
    __onDiscoveryStrategyResult(discoveryResult: any): void;
    __onDiscoveryStrategyResultDevice(device: any, discoveryResult: any): void;
    /**
     * Pass a callback method, which is called when the Driver is ready ({@link Driver#onInit} has been run).
     * The callback is executed immediately when the Drivers Manager was already ready.
     * @param callback {Function}
     */
    ready(callback: Function): void;
    /**
     * Get an Array with all {@link Device} instances
     * @returns {Array} Devices
     */
    getDevices(): any[];
    /**
     * Get a Device instance by its deviceData object.
     * @param deviceData {Object} Unique Device object as provided during pairing
     * @returns Device {Device}
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
    getDiscoveryStrategy(): any;
    /**
     * This method is called when the driver is inited.
     */
    onInit(): void;
    /**
     * This method is called when a pair session starts.
     * @param socket {EventEmitter} Bi-directional socket for communication with the front-end
     */
    onPair(socket: any): void;
    /**
     * This method is called when no custom onPair() method has been defined, and the default is being used.
     * Simple drivers should override this method to provide a list of devices ready to be paired.
     * @param data {Object} Empty object
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Array} callback.result - An array of device objects
     */
    onPairListDevices(data: any, callback?: Function): void;
}
