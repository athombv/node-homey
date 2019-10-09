export = Device;
declare const Device_base: any;
/**
 * The Device class is a representation of a device paired in Homey.
 * This class should be extended and exported from `device.js`, or any custom class as returned in {@link Driver#onMapDeviceClass}.
 * Methods prefixed with `on` are meant to be overriden.
 * It is not allowed to overwrite the constructor.
 * @tutorial Drivers
 * @hideconstructor
 */
declare class Device extends Device_base {
    [x: string]: any;
    constructor(deviceData: any, driver: any, client: any);
    __init(): void;
    __onInit(): void;
    __onCapability(data: any, callback: any): any;
    __onRenamed(args: any): void;
    __onAdded(args: any): void;
    __onDeleted(args: any): void;
    __onSettings(args: any, callback: any): void;
    getAppId(): any;
    /**
     * Pass a callback method, which is called when the Device is ready ({@link Device#onInit} has been run).
     * The callback is executed immediately when the Drivers Manager was already ready.
     * @param callback {Function}
     */
    ready(callback: Function): void;
    /**
     * Get the device's driver
     * @returns {Driver} The device's driver instance
     */
    getDriver(): any;
    /**
     * Get the device's state (capability values)
     * @returns {Object} The device's state object
     */
    getState(): any;
    /**
     * Get the device's data object
     * @returns {Object} The device's data object
     */
    getData(): any;
    /**
     * Set a warning message for this device, to be shown to the user
     * @param message {string} - Custom warning message, or `null` to unset the warning
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    setWarning(message: string, callback?: any): Promise<any>;
    /**
     * Unset the warning message for this device
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unsetWarning(callback?: any): Promise<any>;
    /**
     * Get the device's availability
     * @returns {boolean} If the device is marked as available
     */
    getAvailable(): boolean;
    /**
     * Set the device's availability to true
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    setAvailable(callback?: any): Promise<any>;
    /**
     * Set the device's availability to false, with a message
     * @param message {string} - Custom unavailable message, or `null` for default
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    setUnavailable(message: string, callback?: any): Promise<any>;
    /**
     * Get a device's setting value
     * @param {String} key
     * @returns {*} The value, or `null` when unknown
     */
    getSetting(key: string): any;
    /**
     * Get the device's settings object
     * @returns {Object} The device's settings object
     * @tutorial Drivers-Settings
     */
    getSettings(): any;
    /**
     * Set the device's settings object. The `newSettings` object may contain a subset of all settings.
     * Note that the {@link Device#onSettings} method will not be called when the settings are changed programmatically.
     * @param {Object} settings - A settings object
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     * @tutorial Drivers-Settings
     */
    setSettings(settings: any, callback?: any, ...args: any[]): Promise<any>;
    /**
     * Get an array of capabilities
     * @returns {Array} The device's capabilities array
     */
    getCapabilities(): any[];
    /**
     * Returns true if the device has a certain capability
     * @param {string} capabilityId
     * @returns {boolean}
     */
    hasCapability(capabilityId: string): boolean;
    /**
     * Add a capability to this device.
     * Note: this is an expensive method so use it only when needed.
     * @since 3.0.0
     * @param capabilityId
     */
    addCapability(capabilityId: any): Promise<void>;
    /**
     * Removes a capability from this device.
     * Any Flow that depends on this capability will become broken.
     * Note: this is an expensive method so use it only when needed.
     * @since 3.0.0
     * @param capabilityId
     */
    removeCapability(capabilityId: any): Promise<void>;
    /**
     * Get the device's name
     * @returns {string} The device's name
     */
    getName(): string;
    /**
     * Get the device's class
     * @returns {string} The device's class
     */
    getClass(): string;
    /**
     * Set the device's class
     * Any Flow that depends on this class will become broken.
     * @since 3.0.0
     * @param {string} class
     * @returns {void}
     */
    setClass(c: any): void;
    /**
     * Get the device's energy object
     * @since 3.0.0
     * @returns {object} The device's energy info object
     */
    getEnergy(): any;
    /**
     * Set the device's energy object
     * @since 3.0.0
     * @param {Object} energy
     */
    setEnergy(energy: any): Promise<void>;
    /**
     * Get a device's capability value
     * @param {string} capabilityId
     * @returns {*} The value, or `null` when unknown
     */
    getCapabilityValue(capabilityId: string): any;
    /**
     * Set a device's capability value
     * @param {string} capabilityId
     * @param {*} value
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    setCapabilityValue(capabilityId: string, value: any, callback?: any, ...args: any[]): Promise<any>;
    /**
     * Get a device's capability options.
     * @param {string} capabilityId
     * @since 3.0.0
     * @returns {Object}
     */
    getCapabilityOptions(capabilityId: string): any;
    /**
     * Set a device's capability options.
     * Note: this is an expensive method so use it only when needed.
     * @param {string} capabilityId
     * @since 3.0.0
     * @param {Object} options
     */
    setCapabilityOptions(capabilityId: string, options: any): Promise<void>;
    /**
     * Register a listener for a capability change event.
     * This is invoked when a device's state change is requested.
     * @param {string} capabilityId
     * @param {Function} fn
     * @param {Mixed} fn.value - The new value
     * @param {Object} fn.opts - An object with optional properties, e.g. `{ duration: 300 }`
     * @param {genericCallbackFunction} fn.callback
     * @example
     * this.registerCapabilityListener('dim', ( value, opts ) => {
       *   this.log('value', value);
       *   this.log('opts', opts);
       *   return Promise.resolve();
       * });
     */
    registerCapabilityListener(capabilityId: string, fn: Function): void;
    /**
     * Register a listener for multiple capability change events. The callback is debounced with `timeout`
     * This is invoked when a device's state change is requested.
     * @param {string[]} capabilityIds
     * @param {Function} fn
     * @param {Mixed} fn.valueObj - An object with the changed capability values, e.g. `{ dim: 0.5 }`
     * @param {Object} fn.optsObj - An object with optional properties, per capability, e.g. `{ dim: { duration: 300 } }`
     * @param {genericCallbackFunction} fn.callback
     * @param {number} timeout - The debounce timeout
     * @example
     * this.registerMultipleCapabilityListener([ 'dim', 'light_hue', 'light_saturation' ], ( valueObj, optsObj ) => {
       *   this.log('valueObj', valueObj);
       *   this.log('optsObj', optsObj);
       *   return Promise.resolve();
       * }, 500);
     */
    registerMultipleCapabilityListener(capabilityIds: string[], fn: Function, timeout: number): void;
    /**
     * Trigger a capability listener programmatically.
     * @param {string} capabilityId
     * @param {Mixed} value
     * @param {Object} opts
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    triggerCapabilityListener(capabilityId: string, value: any, opts?: any, callback?: any, ...args: any[]): Promise<any>;
    /**
     * Get the entire store
     * @returns {Object}
     */
    getStore(): any;
    /**
     * Get all store keys.
     * @returns {String[]}
     */
    getStoreKeys(): string[];
    /**
     * Get a store value.
     * @param {string} key
     * @returns {*} value
     */
    getStoreValue(key: string): any;
    /**
     * Set a store value.
     * @param {string} key
     * @param {*} value
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Object} callback.store - The new store
     * @returns {Promise}
     */
    setStoreValue(key: string, value: any, callback?: Function): Promise<any>;
    /**
     * Unset a store value.
     * @param {string} key
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Object} callback.store - The new store
     * @returns {Promise}
     */
    unsetStoreValue(key: string, callback?: Function): Promise<any>;
    __setImage({ id, type, title, image, }: {
        id: any;
        type: any;
        title: any;
        image: any;
    }, callback: any): any;
    /**
     * Set this device's album art
     * @param {Image} image
     * @param callback
     * @param {Error} callback.err
     * @returns {Promise}
     */
    setAlbumArtImage(image: import("./Image"), callback: any): Promise<any>;
    /**
     * Set a device's camera image
     * @param {string} id Unique ID of the image (e.g. `front`)
     * @param {string} title Title of the image (e.g. `Front`)
     * @param {Image} image
     * @param callback
     * @param {Error} callback.err
     * @returns {Promise}
     */
    setCameraImage(id: string, title: string, image: import("./Image"), callback: any): Promise<any>;
    destroy(): void;
    /**
     * @callback Device~settingsCallback
     * @param {Error} [err] - Show a custom error message to the user upon saving the settings
     * @param {string} [result] - A custom success message. Leave empty for the default message.
     */
    /**
     * This method is called when the user updates the device's settings.
     * @param oldSettings {Object} The old settings object
     * @param newSettings {Object} The new settings object
     * @param changedKeys {Array} An array of keys changed since the previous version
     * @param callback {Device~settingsCallback}
     * @tutorial Drivers-Settings
     */
    onSettings(oldSettings: any, newSettings: any, changedKeys: any[], callback: Device): void;
    /**
     * This method is called when the user updates the device's name. Use this to synchronize the name to the device or bridge.
     * @param name {string} The new name
     */
    onRenamed(newName: any): void;
    /**
     * This method is called when the user deleted the device.
     */
    onDeleted(): void;
    /**
     * This method is called when the user adds the device, called just after pairing.
     */
    onAdded(): void;
    /**
     * This method is called when the device is loaded, and properties such as name, capabilities and state are available.
     */
    onInit(): void;
    /**
     * This method is called when a device has been discovered. Overload this method, and return a truthy value when the result belongs to the current device or falsy when it doesn't.
     * By default, the method will match on a device's data.id property.
     * @param discoveryResult {DiscoveryResult}
     */
    onDiscoveryResult(discoveryResult: any): boolean;
    /**
     * This method is called when the device is found for the first time. Overload this method to create a connection to the device. Throwing here will make the device unavailable with the error message.
     * @param discoveryResult {DiscoveryResult}
     */
    onDiscoveryAvailable(discoveryResult: any): void;
    /**
     * This method is called when the device's address has changed.
     * @param discoveryResult {DiscoveryResult}
     */
    onDiscoveryAddressChanged(discoveryResult: any): void;
    /**
     * This method is called when the device has been found again.
     * @param discoveryResult {DiscoveryResult}
     */
    onDiscoveryLastSeenChanged(discoveryResult: any): void;
}
