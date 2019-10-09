export = LedringAnimation;
declare const LedringAnimation_base: any;
/**
 * This class contains an animation that can be played on Homey's LED Ring.
 * @param {Object} opts
 * @param {Array} opts.frames - An array of frames. A frame is an Array of 24 objects with a `r`, `g` and `b` property, which are numbers between 0 and 255.
 * @param {string} opts.priority - How high the animation will have on the priority stack. Can be either `INFORMATIVE`, `FEEDBACK` or `CRITICAL`.
 * @param {number} opts.transition - Transition time (in ms) how fast to fade the information in. Defaults to `300`.
 * @param {number|Boolean} opts.duration - Duration (in ms) how long the animation should be shown. Defaults to `false`. `false` is required for screensavers.
 * @param {Object} opts.options
 * @param {number} opts.options.fps - Frames per second
 * @param {number} opts.options.tfps - Target frames per second (must be divisible by fps)
 * @param {number} opts.options.rpm - Rotations per minute
 */
declare class LedringAnimation extends LedringAnimation_base {
    [x: string]: any;
    constructor(opts: any);
    opts: any;
    /**
     * @event LedringAnimation#start
     * @desc When the animation has started
     */
    /**
     * @event LedringAnimation#stop
     * @desc When the animation has stopped
     */
    /**
     * @event LedringAnimation#finish
     * @desc When the animation has finished (duration has been reached)
     */
    /**
     * Start the animation.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    start(callback?: any): Promise<any>;
    /**
     * Stop the animation.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    stop(callback?: any): Promise<any>;
    /**
     * Update the animation frames.
     * @param {Array} frames
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    updateFrames(frames: any[], callback?: any): Promise<any>;
    /**
     * Register the animation. This is a shorthand method to {@link ManagerLedring#registerAnimation}.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {LedringAnimation} callback.animation
     * @returns {Promise}
     */
    register(callback?: Function): Promise<any>;
    /**
     * Unregister the animation. This is a shorthand method to {@link ManagerLedring#unregisterAnimation}.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {LedringAnimation} callback.animation
     * @returns {Promise}
     */
    unregister(callback?: Function): Promise<any>;
    /**
     * Register this animation as a screensaver. This is a shorthand method to {@link ManagerLedring#registerScreensaver}.
     * @param {String} screensaverName - The name of the screensaver, as defined in `/app.json`
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    registerScreensaver(screensaverId: any, callback?: any): Promise<any>;
    /**
     * Unregister this animation as a screensaver. This is a shorthand method to {@link ManagerLedring#unregisterScreensaver}.
     * @param {String} screensaverName - The name of the screensaver, as defined in `/app.json`
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterScreensaver(screensaverId: any, callback?: any): Promise<any>;
    toJSON(): any;
}
