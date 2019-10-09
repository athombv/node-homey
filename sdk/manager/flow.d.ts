import Manager = require("../lib/Manager");
import FlowCard = require("../lib/FlowCard");
import FlowToken = require("../lib/FlowToken");

export = ManagerFlow;
/**
 * @memberof Homey
 * @namespace ManagerFlow
 * @global
 */
declare class ManagerFlow extends Manager {
    /**
     * Get a {@link FlowCard}.
     * @param {string} type - Can be either `trigger`, `condition` or `action`.
     * @param {string} id - Id of the flow card as defined in your app's `app.json`.
     * @returns {FlowCard|Error}
     */
    getCard(type: string, id: string): FlowCard | Error;
    /**
     * Register a {@link FlowCard}.
     * @param {FlowCard} cardInstance
     * @returns {FlowCard}
     */
    registerCard(cardInstance: FlowCard): FlowCard;
    /**
     * Unregister a {@link FlowCard}.
     * @param {FlowCard} cardInstance
     */
    unregisterCard(cardInstance: FlowCard): void;
    /**
     * Register a {@link FlowToken}.
     * @param {FlowToken} tokenInstance
     * @returns {Promise<FlowToken>}
     */
    registerToken(tokenInstance: FlowToken): Promise<FlowToken>;
    /**
     * Unregister a {@link FlowToken}.
     * @param {FlowToken} tokenInstance
     * @returns {Promise<any>}
     */
    unregisterToken(tokenInstance: FlowToken): Promise<any>;

}
