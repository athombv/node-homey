export = LedringAnimationSystem;
/**
 * This class contains a system animation that can be played on Homey's LED Ring.
 * @extends LedringAnimation
 * @param {string} systemId - The system animation's ID. Can be either `colorwipe`, `loading`, `off`, `progress`, `pulse`, `rainbow`, `rgb` or `solid`.
 * @param {Object} opts
 * @param {string} opts.priority - How high the animation will have on the priority stack. Can be either `INFORMATIVE`, `FEEDBACK` or `CRITICAL`.
 * @param {number|boolean} opts.duration - Duration (in ms) how long the animation should be shown. Defaults to `false`. `false` is required for screensavers.
 */
declare class LedringAnimationSystem {
    constructor(systemId: any, opts: any);
}
