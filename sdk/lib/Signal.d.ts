export = Signal;
declare const Signal_base: any;
/**
 * The Signal class represents an Signal as defined in the app's <code>app.json</code>.
 * @tutorial Signals
 */
declare class Signal extends Signal_base {
    [x: string]: any;
    /**
     * @param {string} id - The ID of the signal, as defined in the app's <code>app.json</code>.
     * @param {string} frequency - The frequency of the signal
     */
    constructor(id: string, frequency: string);
    id: string;
    frequency: string;
    _signalObj: any;
    /**
     * Register the signal.
     * This is a shorthand method for {@link ManagerRF#registerSignal}.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    register(callback?: any): Promise<any>;
    /**
     * Unregister the signal.
     * This is a shorthand method for {@link ManagerRF#unregisterSignal}.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregister(callback?: any): Promise<any>;
    /**
     * Transmit a frame
     * @param {Array} frame - An array of word indexes
     * @param {object} [opts] - Transmission options
     * @param {object} [opts.repetitions] - A custom amount of repetitions
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    tx(frame: any[], opts?: {
        repetitions?: any;
    }, callback?: any): Promise<any>;
    /**
     * Transmit a command
     * @param {string} commandId - The ID of the command, as specified in `/app.json`
     * @param {object} [opts] - Transmission options
     * @param {object} [opts.repetitions] - A custom amount of repetitions
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    cmd(commandId: string, opts?: {
        repetitions?: any;
    }, callback?: any): Promise<any>;
}
