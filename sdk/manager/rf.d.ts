export = ManagerRF;
declare const ManagerRF_base: any;
/**
 * @memberof Homey
 * @namespace ManagerRF
 * @global
 */
declare class ManagerRF extends ManagerRF_base {
    [x: string]: any;
    __onInit(): void;
    _signals: {};
    _getSignal(registerId: any): any;
    _onEvent(data: any): void;
    _onSignalTx(registerId: any, frame: any, opts: any, callback: any): any;
    _onSignalCmd(registerId: any, commandId: any, opts: any, callback: any): any;
    /**
     * Register a Signal instance, to send and receive events.
     * @param {Signal} signalInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Signal} callback.signal
     * @returns {Promise}
     */
    registerSignal(signalInstance: any, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Unregister a Signal instance, to send and receive events.
     * @param {Signal} signalInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterSignal(signalInstance: any, callback?: any, ...args: any[]): Promise<any>;
}
