export = ManagerDiscovery;
declare const ManagerDiscovery_base: any;
/**
 * Discovery can be used to automatically find devices on the Homey's network. Usually, you don't want to use this manager directly, but link it automatically by using Drivers.
 * @see DiscoveryResultMDNSSD
 * @see DiscoveryResultSSDP
 * @see DiscoveryResultMAC
 * @memberof Homey
 * @namespace ManagerDiscovery
 * @global
 * @since 2.5.0
 */
declare class ManagerDiscovery extends ManagerDiscovery_base {
    [x: string]: any;
    __onInit(): void;
    /**
     * @param strategyId {string} The ID as defined in your `app.json`
     * @returns {DiscoveryStrategy}
     */
    getDiscoveryStrategy(strategyId: string): import("../lib/DiscoveryStrategy");
}
