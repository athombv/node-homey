export = DiscoveryResultSSDP;
declare const DiscoveryResultSSDP_base: typeof import("./DiscoveryResult");
/**
 * This is a discovery result of a SSDP discovery strategy.
 * This class should not be instanced manually.
 * @extends DiscoveryResult
 * @since 2.5.0
 * @property {string} id - The identifier of the result.
 * @property {Date} lastSeen - When the device has been last discovered.
 * @property {string} address - The (IP) address of the device.
 * @property {string} port - The port of the device.
 * @property {Object} headers - The headers (lowercase) in the SSDP response.
 *
 */
declare class DiscoveryResultSSDP extends DiscoveryResultSSDP_base {
    constructor(props: any);
}
