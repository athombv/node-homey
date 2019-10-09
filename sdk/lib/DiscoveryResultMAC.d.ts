export = DiscoveryResultMAC;
declare const DiscoveryResultMAC_base: typeof import("./DiscoveryResult");
/**
 * This is a discovery result of a MAC discovery strategy.
 * This class should not be instanced manually.
 * @extends DiscoveryResult
 * @since 2.5.0
 * @property {string} id - The identifier of the result.
 * @property {Date} lastSeen - When the device has been last discovered.
 * @property {string} address - The (IP) address of the device.
 * @property {string} mac - The MAC address of the device.
 */
declare class DiscoveryResultMAC extends DiscoveryResultMAC_base {
    constructor(props: any);
}
