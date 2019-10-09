import Signal = require("./Signal");

export = SignalInfrared;
/**
 * The SignalInfrared class represents an Infrared Signal
 * @extends Signal
 */
declare class SignalInfrared extends Signal {
    /**
     * @param {string} id - The ID of the signal, as defined in the app's <code>app.json</code>.
     */
    constructor(id: string);
}
