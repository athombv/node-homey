import LedringAnimationSystem = require("./LedringAnimationSystem");

export = LedringAnimationSystemProgress;

type LedringAnimationSystemProgressOpts = {
    /** How high the animation will have on the priority stack */
    priority: "INFORMATIVE" | "FEEDBACK" | "CRITICAL",
    /** Duration (in ms) how long the animation should be shown. Defaults to `false`. `false` is required for screensavers. */
    options: {
        /** #0092ff - A HEX string */
        color: string;
    }
};

/**
 * This class contains a system animation that can be played on Homey's LED Ring.
 */
declare class LedringAnimationSystemProgress extends LedringAnimationSystem {
    constructor(opts: LedringAnimationSystemProgressOpts);
    /**
     * Set the current progress
     * @param {number} progress - A progress number between 0 - 1
     * @returns {Promise<any>}
     */
    setProgress(progress: number): Promise<any>;
}
