import SimpleClass = require("./SimpleClass");

export = App;
/**
 * The App class is your start point for any app.
 * This class should be extended and exported from `app.js`.
 * Methods prefixed with `on` are meant to be overriden.
 * It is not allowed to overwrite the constructor.
 * @extends SimpleClass
 * @hideconstructor
 * @example <caption><code>/app.js</code></caption>
 * const Homey = require('homey');
 *
 * class MyApp extends Homey.App {
 *
 *   onInit() {
 *     this.log('My App is running!');
 *   }
 *
 * }
 *
 * module.exports = MyApp;
 */
declare class App extends SimpleClass {
    constructor(manifest: any);
    /**
     * This method is called upon initialization of your app
     */
    onInit(): void;
}
