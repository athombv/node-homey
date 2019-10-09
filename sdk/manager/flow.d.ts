export = ManagerFlow;
declare const ManagerFlow_base: any;
/**
 * @memberof Homey
 * @namespace ManagerFlow
 * @global
 */
declare class ManagerFlow extends ManagerFlow_base {
    [x: string]: any;
    __onInit(): void;
    _cards: {
        trigger: {};
        condition: {};
        action: {};
    };
    _tokens: {};
    /**
     * Get a {@link FlowCard}.
     * @param {string} type - Can be either `trigger`, `condition` or `action`.
     * @param {string} id - Id of the flow card as defined in your app's `app.json`.
     * @returns {FlowCard|Error}
     */
    getCard(type: string, id: string): any;
    /**
     * Register a {@link FlowCard}.
     * @param {FlowCard} cardInstance
     * @returns {FlowCard}
     */
    registerCard(cardInstance: any): any;
    /**
     * Unregister a {@link FlowCard}.
     * @param {FlowCard} cardInstance
     */
    unregisterCard(cardInstance: any): void;
    /**
     * Register a {@link FlowToken}.
     * @param {FlowToken} tokenInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {FlowToken} callback.token
     * @returns {Promise}
     */
    registerToken(tokenInstance: any, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Unregister a {@link FlowToken}.
     * @param {FlowToken} tokenInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterToken(tokenInstance: any, callback?: any, ...args: any[]): Promise<any>;
    _onTokenEmit(tokenId: any, event: any, opts: any, callback: any): any;
    _onRun(data: any, callback: any): any;
    _onUpdate(data: any, callback: any): any;
    _onAutocomplete(data: any, callback: any): any;
    _onCardTrigger(triggerId: any, tokens: any, state: any, callback: any): any;
    _onCardTriggerDevice(triggerId: any, device: any, tokens: any, state: any, callback: any): any;
    _onCardGetArgumentValues(cardId: any, cardType: any, callback: any): any;
}
