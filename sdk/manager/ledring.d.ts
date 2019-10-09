import Manager = require("../lib/Manager");
import LedringAnimation = require("../lib/LedringAnimation");

export = ManagerLedring;
/**
 * @memberof Homey
 * @namespace ManagerLedring
 * @global
 */
declare class ManagerLedring extends Manager {
    /**
     * Register a LED Ring animation.
     * @param {LedringAnimation} animationInstance
     * @returns {Promise<LedringAnimation>}
     */
    registerAnimation(animationInstance: LedringAnimation): Promise<LedringAnimation>;
    /**
     * Unregister a LED Ring animation.
     * @param {LedringAnimation} animationInstance
     * @returns {Promise<LedringAnimation>}
     */
    unregisterAnimation(animationInstance: LedringAnimation): Promise<LedringAnimation>;
    /**
     * Register a LED Ring screensaver.
     * @param {string} name - Name of the animation as defined in your app's `app.json`.
     * @param {LedringAnimation} animationInstance
     * @returns {Promise<any>}
     */
    registerScreensaver(name: string, animationInstance: LedringAnimation): Promise<any>;
    /**
     * Unregister a LED Ring screensaver.
     * @param {string} name - Name of the animation as defined in your app's `app.json`.
     * @param {LedringAnimation} animationInstance
     * @returns {Promise<any>}
     */
    unregisterScreensaver(name: string, animationInstance: LedringAnimation): Promise<any>;
}
