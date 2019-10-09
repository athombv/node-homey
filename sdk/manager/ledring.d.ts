export = ManagerLedring;
declare const ManagerLedring_base: any;
/**
 * @memberof Homey
 * @namespace ManagerLedring
 * @global
 */
declare class ManagerLedring extends ManagerLedring_base {
    [x: string]: any;
    __onInit(): void;
    _animations: {};
    _onAnimationStart(animationId: any, callback: any): any;
    _onAnimationStop(animationId: any, callback: any): any;
    _onAnimationUpdateFrames(animationId: any, frames: any, callback: any): any;
    _onAnimationFn(animationId: any, method: any, args: any, callback: any): any;
    /**
     * Register a LED Ring animation.
     * @param {LedringAnimation} animationInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {LedringAnimation} callback.animation
     * @returns {Promise}
     */
    registerAnimation(animationInstance: any, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Unregister a LED Ring animation.
     * @param {LedringAnimation} animationInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterAnimation(animationInstance: any, callback?: any, ...args: any[]): Promise<any>;
    /**
     * Register a LED Ring screensaver.
     * @param {string} name - Name of the animation as defined in your app's `app.json`.
     * @param {LedringAnimation} animationInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    registerScreensaver(name: string, animationInstance: any, callback?: any): Promise<any>;
    /**
     * Unregister a LED Ring screensaver.
     * @param {string} name - Name of the animation as defined in your app's `app.json`.
     * @param {LedringAnimation} animationInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterScreensaver(name: string, animationInstance: any, callback?: any): Promise<any>;
}
