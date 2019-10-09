import Signal = require("./Signal");

export = Signal433;
/**
 * The Signal433 class represents an 433 MHz Signal
 * @extends Signal
 */
declare class Signal433 extends Signal {
    /**
     * @param {string} id - The ID of the signal, as defined in the app's <code>app.json</code>.
     */
    constructor(id: string);
}
