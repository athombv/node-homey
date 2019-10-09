export = FlowCard;
declare const FlowCard_base: any;
/**
 * The FlowCard class is a programmatic representation of a Flow card, as defined in the app's `/app.json`.
 */
declare class FlowCard extends FlowCard_base {
    [x: string]: any;
    /**
     * @param {string} id - The ID of the card as defined in the app's `app.json`.
     */
    constructor(id: string);
    id: string;
    type: string;
    _cardObj: any;
    _args: {};
    _runListener: any;
    _onRun(args: any, state: any, callback: any): any;
    /**
     * This event is fired when the card is updated by the user (e.g. a Flow has been saved).
     *
     * @event FlowCard#update
     */
    _onUpdate(args: any): void;
    _onAutocomplete(data: any, callback: any): any;
    /**
     * Get an FlowArgument instance.
     * @returns {FlowArgument}
     */
    getArgument(argumentId: any): any;
    /**
     * Get the current argument values of this card, as filled in by the user.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Array} callback.values - An array of key-value objects with the argument's name as key. Every array entry represents one Flow card.
     * @returns {Promise}
     */
    getArgumentValues(callback?: Function): Promise<any>;
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
     * Return a Promise, or run the `callback`.
     * @param {Function} fn
     * @param {Object} fn.args - The arguments of the Flow Card, with keys as defined in the `/app.json` and values as specified by the user
     * @param {Object} fn.state - The state of the Flow
     * @param {genericCallbackFunction} fn.callback
     * @returns {FlowCard}
     */
    registerRunListener(callback: any): FlowCard;
}
