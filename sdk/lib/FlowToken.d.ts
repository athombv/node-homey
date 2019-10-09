export = FlowToken;
/**
 * The FlowToken class can be used to create a Tag in the Flow Editor.
 * @param {string} id - ID of the token, should be alphanumeric.
 * @param {Object} opts
 * @param {string} opts.type - Type of the token, can be either `string`, `number`, `boolean` or `image`.
 * @param {string} opts.title - Title of the token
 * @tutorial Flow-Tokens
 */
declare class FlowToken {
    constructor(id: any, opts: any);
    /**
     * Register the token.
     * This is a shorthand method for {@link ManagerFlow#registerToken}.
     * @returns {Promise<FlowToken>}
     */
    register(): Promise<FlowToken>;
    /**
     * Unregister the token.
     * This is a shorthand method for {@link ManagerFlow#unregisterToken}.
     * @returns {Promise<any>}
     */
    unregister(): Promise<any>;
    /**
     * Set or update the value of the token.
     * @param {string|number|boolean|Image} value - The value of the token, should be of the same type as defined in the Token instance
     * @returns {Promise<any>}
     */
    setValue(value: any): Promise<any>;
}
