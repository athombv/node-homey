export = DiscoveryStrategy;
declare const DiscoveryStrategy_base: any;
/**
 * This class should not be instanced manually, but created by calling {@link ManagerDiscovery#getDiscoveryStrategy} instead.
 * @since 2.5.0
 * @hideconstructor
 */
declare class DiscoveryStrategy extends DiscoveryStrategy_base {
    [x: string]: any;
    /**
     * Fires when a new result has been found.
     * @event DiscoveryStrategy#result
     * @param {DiscoveryResultMDNSSD|DiscoveryResultSSDP|DiscoveryResultMAC} discoveryResult
     */
    constructor({ type }: any);
    type: any;
    /**
     *
     * @returns {Object} Returns an object of {@link DiscoveryResultMDNSSD}, {@link DiscoveryResultSSDP} or {@link DiscoveryResultMAC} instances.
     */
    getDiscoveryResults(): any;
    /**
     * @param {string} id
     * @returns {DiscoveryResult} Returns a {@link DiscoveryResultMDNSSD}, {@link DiscoveryResultSSDP} or {@link DiscoveryResultMAC} instance.
     */
    getDiscoveryResult(id: string): any;
}
