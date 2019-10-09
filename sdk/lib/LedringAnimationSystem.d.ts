import LedringAnimation = require("./LedringAnimation");

export = LedringAnimationSystem;

type SystemAnimation = "colorwipe" | "loading" | "off" | "progress" | "pulse" | "rainbow" | "rgb" | "solid";
type LedringAnimationSystemOpts = {
    /** How high the animation will have on the priority stack */
    priority: "INFORMATIVE" | "FEEDBACK" | "CRITICAL",
    /** Duration (in ms) how long the animation should be shown. Defaults to `false`. `false` is required for screensavers. */
    duration: number | boolean;
};


/**
 * This class contains a system animation that can be played on Homey's LED Ring.
 */
declare class LedringAnimationSystem extends LedringAnimation {
    constructor(systemId: SystemAnimation, opts: LedringAnimationSystemOpts);
}
