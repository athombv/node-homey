export = FlowArgument;
declare const FlowArgument_base: any;
/**
 * The FlowArgument class represents an argument for a Flow Card as defined in the app's `app.json`.
 * This class must not be initiated by the developer, but retrieved by calling {@link FlowCard#getArgument}.
 * @hideconstructor
 */
declare class FlowArgument extends FlowArgument_base {
    [x: string]: any;
    constructor(argObj: any);
    _autocompleteListener: Function;
    /**
     * Register a listener for a autocomplete event. Return a Promise, or run the callback.
     * This is fired when the argument is of type `autocomplete` and the user typed a query.
     * @param {Function} fn
     * @param {string} fn.query - The typed query by the user
     * @param {Object} fn.args - The current state of the arguments, as selected by the user in the front-end
     * @param {Function} fn.callback
     * @param {Error} fn.callback.err
     * @param {Array} fn.callback.result - An array of result objects
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
    registerAutocompleteListener(fn: Function): FlowArgument;
    _onAutocomplete(query: any, args: any, callback: any): any;
}
