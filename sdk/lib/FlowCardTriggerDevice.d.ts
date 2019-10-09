export = FlowCardTriggerDevice;
/**
 * The FlowCardTriggerDevice class is a programmatic representation of a Flow Card with type `trigger` and an argument with type `device` and a filter with `driver_id`, as defined in an app's <code>app.json</code>.
 * @extends FlowCardTrigger
 */
declare class FlowCardTriggerDevice {
    /**
     * @param {string} id - The ID of the card as defined in the app's <code>app.json</code>.
     */
    constructor(id: string);
    /**
     * Trigger this card to start a Flow
     * @param {Device} device - A Device instance
     * @param {Object} tokens - An object with tokens and their typed values, as defined in an app's <code>app.json</code>
     * @param {Object} state - An object with properties which are accessible throughout the Flow
     * @param {genericCallbackFunction} callback
     * @returns {Promise} Returns a promise when callback is omitted
     */
    trigger(device: any, tokens: any, state: any, callback: any): Promise<any>;
}
