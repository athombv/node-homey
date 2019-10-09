import SimpleClass = require("./SimpleClass");
import DiscoveryResultMDNSSD = require("./DiscoveryResultMDNSSD");
import DiscoveryResultSSDP = require("./DiscoveryResultSSDP");
import DiscoveryResultMAC = require("./DiscoveryResultMAC");

export = DiscoveryStrategy;
/**
 * This class should not be instanced manually, but created by calling {@link ManagerDiscovery#getDiscoveryStrategy} instead.
 * @since 2.5.0
 * @hideconstructor
 */
declare class DiscoveryStrategy extends SimpleClass {
    /**
     * Fires when a new result has been found.
     * @event DiscoveryStrategy#result
     * @param {DiscoveryResultMDNSSD|DiscoveryResultSSDP|DiscoveryResultMAC} discoveryResult
     */
    private constructor({ type }: any);
    /**
     *
     * @returns {Object} Returns an object of {@link DiscoveryResultMDNSSD}, {@link DiscoveryResultSSDP} or {@link DiscoveryResultMAC} instances.
     */
    getDiscoveryResults(): Record<string, DiscoveryResultMDNSSD | DiscoveryResultSSDP | DiscoveryResultMAC>;
    /**
     * @param {string} id
     * @returns {DiscoveryResult} Returns a {@link DiscoveryResultMDNSSD}, {@link DiscoveryResultSSDP} or {@link DiscoveryResultMAC} instance.
     */
    getDiscoveryResult(id: string): DiscoveryResultMDNSSD | DiscoveryResultSSDP | DiscoveryResultMAC;
}
