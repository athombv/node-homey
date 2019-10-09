import SimpleClass = require("./SimpleClass");

export = DiscoveryResult;

/**
 * This class should not be instanced manually.
 * @since 2.5.0
 */
declare class DiscoveryResult extends SimpleClass {
    /** The identifier of the result. */
    id: string
    /** When the device has been last discovered. */
    lastSeen: Date
    /**
     * Fires when the address has changed.
     * @event DiscoveryResult#addressChanged
     * @param {DiscoveryResult} discoveryResult
     */
    /**
     * Fires when the device has been seen again.
     * @event DiscoveryResult#lastSeenChanged
     * @param {DiscoveryResult} discoveryResult
     */
    protected constructor(props: any);
}
