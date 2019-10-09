import Manager = require("../lib/Manager");

export = ManagerSettings;
/**
 * @memberof Homey
 * @namespace ManagerSettings
 * @global
 */
declare class ManagerSettings extends Manager {
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
}
