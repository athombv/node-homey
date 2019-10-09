export = FlowCardTrigger;
/**
 * The FlowCardTrigger class is a programmatic representation of a Flow Card with type `trigger`, as defined in an app's <code>app.json</code>.
 * @extends FlowCard
 */
declare class FlowCardTrigger {
    /**
     * @param {string} id - The ID of the card as defined in the app's <code>app.json</code>.
     */
    constructor(id: string);
    /**
     * Trigger this card to start a Flow
     * @param {Object} tokens - An object with tokens and their typed values, as defined in an app's <code>app.json</code>
     * @param {Object} state - An object with properties which are accessible throughout the Flow
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise} Returns a promise when callback is omitted
     */
    trigger(tokens: any, state: any, callback?: any): Promise<any>;
}
