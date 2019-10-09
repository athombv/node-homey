export = ManagerSettings;
declare const ManagerSettings_base: any;
/**
 * @memberof Homey
 * @namespace ManagerSettings
 * @global
 */
declare class ManagerSettings extends ManagerSettings_base {
    [x: string]: any;
    __onInit(): void;
    _updateSettingsTimeout: any;
    _writing: boolean;
    _settings: any;
    _onSettingsGet(data: any, callback: any): any;
    _onSettingsSet(data: any, callback: any): any;
    _onSettingsUnset(data: any, callback: any): any;
    /**
     * Get all settings keys.
     * @returns {String[]}
     */
    getKeys(): string[];
    /**
     * Get a setting.
     * @param {string} key
     * @returns {Mixed} value
     */
    get(key: string): any;
    /**
     * Fires when a setting has been set.
     * @event ManagerSettings#set
     * @param {String} key
     */
    /**
     * Set a setting.
     * @param {string} key
     * @param {Mixed} value
     */
    set(key: string, value: any): void;
    /**
     * Fires when a setting has been unset.
     * @event ManagerSettings#unset
     * @param {String} key
     */
    /**
     * Unset (delete) a setting.
     * @param {string} key
     */
    unset(key: string): void;
    _updateSettings(): void;
    _realtime(event: any, data: any): void;
}
