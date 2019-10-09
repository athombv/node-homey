import Manager = require("../lib/Manager");

export = ManagerI18n;
/**
 * @memberof Homey
 * @namespace ManagerI18n
 * @global
 */
declare class ManagerI18n extends Manager {
    /**
     * Translate a string, as defined in the app's `/locales/<language>.json` file.
     * This method is also available at @{link Homey#__}
     * @function ManagerI18n#__
     * @name ManagerI18n#__
     * @param {string} key
     * @param {Object} properties - An object of properties to replace. For example, in your json define <em>Hello, __name__!</em>. The property <em>name</em> would contain a string, e.g. <em>Dave</em>.
     * @returns {string} The translated string
     * @example <caption><code>/locales/en.json</code></caption>
     * {
     *   "welcome": "Welcome, __name__!"
     * }
     * @example <caption>/app.js</caption>
     * const Homey = require('homey');
     *
     * let welcomeMessage = Homey.__('welcome', {
     *   name: 'Dave'
     * }
     * console.log( welcomeMessage ); // "Welcome, Dave!"
     */
    __(input: any, context: any): any;

    /**
     * Get Homey's current language
     * @returns {string} The language as a 2-character string (e.g. `en`)
     */
    getLanguage(): string;
    /**
     * Get Homey's current units
     * @returns {string} `metric` or `imperial`
     */
    getUnits(): string;
}
