export = DiscoveryResult;
declare const DiscoveryResult_base: any;
/**
 * This class should not be instanced manually.
 * @property {string} id - The identifier of the result.
 * @property {Date} lastSeen - When the device has been last discovered.
 * @since 2.5.0
 */
declare class DiscoveryResult extends DiscoveryResult_base {
    [x: string]: any;
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
    constructor(props: any);
}
