/// <reference types="node" />
export = LedringAnimation;
declare const LedringAnimation_base: typeof import("events").EventEmitter;

type LedringAnimationOpts = {
    /** An array of frames. A frame is an Array of 24 objects with a `r`, `g` and `b` property, which are numbers between 0 and 255. */
    frames: Array<[number, number, number]>;
    /** How high the animation will have on the priority stack. Can be either `INFORMATIVE`, `FEEDBACK` or `CRITICAL`. */
    priority: string;
    /** Transition time (in ms) how fast to fade the information in. Defaults to `300`. */
    transition: number;
    /** Duration (in ms) how long the animation should be shown. Defaults to `false`. `false` is required for screensavers. */
    duration: number|Boolean;
    options: {
        /** Frames per second */
        fps: number;
        /** Target frames per second (must be divisible by fps) */
        tfps: number;
        /** Rotations per minute */
        rpm: number;
    }
}
/**
 * This class contains an animation that can be played on Homey's LED Ring.

 */
declare class LedringAnimation extends LedringAnimation_base {
    constructor(opts: LedringAnimationOpts);
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
     * @returns {Promise<any>}
     */
    start(): Promise<any>;
    /**
     * Stop the animation.
     * @returns {Promise<any>}
     */
    stop(): Promise<any>;
    /**
     * Update the animation frames.
     * @param {Array} frames
     * @returns {Promise<any>}
     */
    updateFrames(frames: any[]): Promise<any>;
    /**
     * Register the animation. This is a shorthand method to {@link ManagerLedring#registerAnimation}.
     * @returns {Promise<LedringAnimation>}
     */
    register(): Promise<LedringAnimation>;
    /**
     * Unregister the animation. This is a shorthand method to {@link ManagerLedring#unregisterAnimation}.
     * @returns {Promise<LedringAnimation>}
     */
    unregister(): Promise<LedringAnimation>;
    /**
     * Register this animation as a screensaver. This is a shorthand method to {@link ManagerLedring#registerScreensaver}.
     * @param {String} screensaverName - The name of the screensaver, as defined in `/app.json`
     * @returns {Promise<any>}
     */
    registerScreensaver(screensaverId: any): Promise<any>;
    /**
     * Unregister this animation as a screensaver. This is a shorthand method to {@link ManagerLedring#unregisterScreensaver}.
     * @param {String} screensaverName - The name of the screensaver, as defined in `/app.json`
     * @returns {Promise<any>}
     */
    unregisterScreensaver(screensaverId: any): Promise<any>;
    toJSON(): any;
}
