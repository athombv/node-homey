export = DiscoveryResultMDNSSD;
declare const DiscoveryResultMDNSSD_base: typeof import("./DiscoveryResult");
/**
 * This is a discovery result of a mDNS-SD discovery strategy.
 * This class should not be instanced manually.
 * @extends DiscoveryResult
 * @since 2.5.0
 * @property {string} id - The identifier of the result.
 * @property {Date} lastSeen - When the device has been last discovered.
 * @property {string} address - The (IP) address of the device.
 * @property {string} port - The port of the device.
 * @property {Object} txt - The TXT records of the device, key-value.
 * @property {String} name - The name of the device.
 * @property {String} fullname - The full name of the device.
 */
declare class DiscoveryResultMDNSSD extends DiscoveryResultMDNSSD_base {
    constructor(props: any);
}
