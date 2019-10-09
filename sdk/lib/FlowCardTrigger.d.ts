import FlowCard = require("./FlowCard");

export = FlowCardTrigger;
/**
 * The FlowCardTrigger class is a programmatic representation of a Flow Card with type `trigger`, as defined in an app's <code>app.json</code>.
 * @extends FlowCard
 */
declare class FlowCardTrigger extends FlowCard {
    /**
     * Trigger this card to start a Flow
     * @param {Object} tokens - An object with tokens and their typed values, as defined in an app's <code>app.json</code>
     * @param {Object} state - An object with properties which are accessible throughout the Flow
     * @returns {Promise<any>} Promise resolves when flow is triggered
     */
    trigger(tokens: any, state: any): Promise<any>;
}
