export = LedringAnimationSystemProgress;
/**
 * This class contains a system animation that can be played on Homey's LED Ring.
 * @extends LedringAnimationSystem
 * @param {Object} opts
 * @param {string} opts.priority - How high the animation will have on the priority stack. Can be either `INFORMATIVE`, `FEEDBACK` or `CRITICAL`.
 * @param {Object} opts.options
 * @param {string} opts.options.color=#0092ff - A HEX string
 */
declare class LedringAnimationSystemProgress {
    constructor(opts: any);
    /**
     * Set the current progress
     * @param {number} progress - A progress number between 0 - 1
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    setProgress(progress: number, callback?: any): Promise<any>;
}
