import SimpleClass = require("./SimpleClass");

export = FlowCard;
/**
 * The FlowCard class is a programmatic representation of a Flow card, as defined in the app's `/app.json`.
 */
declare class FlowCard extends SimpleClass {
    /**
     * @param {string} id - The ID of the card as defined in the app's `app.json`.
     */
    constructor(id: string);
    id: string;
    type: string;
    /**
     * This event is fired when the card is updated by the user (e.g. a Flow has been saved).
     *
     * @event FlowCard#update
     */
    /**
     * Get an FlowArgument instance.
     * @returns {FlowArgument}
     */
    getArgument(argumentId: any): any;
    /**
     * Get the current argument values of this card, as filled in by the user.
     * @returns {Promise<any[]>} A Promise that resolves to an array of key-value objects with the argument's name as key. Every array entry represents one Flow card.
     */
    getArgumentValues(): Promise<any[]>;
    /**
     * Register the Card.
     * This is a shorthand method for {@link ManagerFlow#registerCard}.
     * @returns {FlowCard}
     */
    register(): FlowCard;
    /**
     * Unregister the Card.
     * This is a shorthand method for {@link ManagerFlow#unregisterCard}.
     */
    unregister(): any;
    /**
     * Register a listener for a run event.
     * @param {Function} listener - Should return a promise that resolves to the FlowCards run result
     * @param {Object} listener.args - The arguments of the Flow Card, with keys as defined in the `/app.json` and values as specified by the user
     * @param {Object} listener.state - The state of the Flow
     * @returns {FlowCard}
     */
    registerRunListener(listener: Function): FlowCard;
}
