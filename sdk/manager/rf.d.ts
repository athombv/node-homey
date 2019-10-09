import Manager = require("../lib/Manager");
import Signal = require("../lib/Signal");

export = ManagerRF;
/**
 * @memberof Homey
 * @namespace ManagerRF
 * @global
 */
declare class ManagerRF extends Manager {
    /**
     * Register a Signal instance, to send and receive events.
     * @template {Signal} T
     * @param {T} signalInstance
     * @returns {Promise<T>}
     */
    registerSignal<T extends Signal>(signalInstance: T): Promise<T>;
    /**
     * Unregister a Signal instance, to send and receive events.
     * @param {Signal} signalInstance
     * @returns {Promise<void>}
     */
    unregisterSignal<T extends Signal>(signalInstance: T): Promise<void>;
}
