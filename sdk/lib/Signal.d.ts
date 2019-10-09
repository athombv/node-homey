import SimpleClass = require("./SimpleClass");

export = Signal;
/**
 * The Signal class represents an Signal as defined in the app's <code>app.json</code>.
 * @tutorial Signals
 */
declare class Signal extends SimpleClass {
    /**
     * @param {string} id - The ID of the signal, as defined in the app's <code>app.json</code>.
     * @param {string} frequency - The frequency of the signal
     */
    constructor(id: string, frequency: string);
    /**
     * Register the signal.
     * This is a shorthand method for {@link ManagerRF#registerSignal}.
     * @returns {Promise<this>}
     */
    register(): Promise<Signal>;
    /**
     * Unregister the signal.
     * This is a shorthand method for {@link ManagerRF#unregisterSignal}.
     * @returns {Promise<void>}
     */
    unregister(): Promise<void>;
    /**
     * Transmit a frame
     * @param {Array} frame - An array of word indexes
     * @param {object} [opts] - Transmission options
     * @param {object} [opts.repetitions] - A custom amount of repetitions
     * @returns {Promise<any>}
     */
    tx(frame: any[], opts?: {
        repetitions?: any;
    }): Promise<any>;
    /**
     * Transmit a command
     * @param {string} commandId - The ID of the command, as specified in `/app.json`
     * @param {object} [opts] - Transmission options
     * @param {object} [opts.repetitions] - A custom amount of repetitions
     * @returns {Promise<any>}
     */
    cmd(commandId: string, opts?: {
        repetitions?: any;
    }): Promise<any>;
}
