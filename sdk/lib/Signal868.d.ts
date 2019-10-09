import Signal = require("./Signal");

export = Signal868;
/**
 * The Signal868 class represents an 868 MHz Signal
 * @extends Signal
 */
declare class Signal868 extends Signal {
    /**
     * @param {string} id - The ID of the signal, as defined in the app's <code>app.json</code>.
     */
    constructor(id: string);
}
