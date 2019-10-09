import SimpleClass = require("./SimpleClass");

export = FlowArgument;
/**
 * The FlowArgument class represents an argument for a Flow Card as defined in the app's `app.json`.
 * This class must not be initiated by the developer, but retrieved by calling {@link FlowCard#getArgument}.
 * @hideconstructor
 */
declare class FlowArgument extends SimpleClass {
    constructor(argObj: any);
    /**
     * Register a listener for a autocomplete event.
     * This is fired when the argument is of type `autocomplete` and the user typed a query.
     *
     * @param {Function} listener - Should return a promise that resolves to the autocomplete results.
     * @param {string} listener.query - The typed query by the user
     * @param {Object} listener.args - The current state of the arguments, as selected by the user in the front-end
     * @returns {FlowArgument}
     *
     * @example
     * const Homey = require('homey');
     *
     * let myAction = new Homey.FlowCardAction('my_action');
     * myAction.register();
     *
     * let myActionMyArg = myAction.getArgument('my_arg');
     * myActionMyArg.registerAutocompleteListener( ( query, args ) => {
     *   let results = [
     *     {
     *       "id": "abcd",
     *       "name": "My Value"
     *     }
     *   ];
     *
     *   // filter for query
     *   results = results.filter( result => {
     *     return result.label.toLowerCase().indexOf( query.toLowerCase() ) > -1;
     *   });
     *
     *   return Promise.resolve( results );
     * });
     */
    registerAutocompleteListener(listener: Function): FlowArgument;
}
