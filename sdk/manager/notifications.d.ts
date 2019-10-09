export = ManagerNotifications;
declare const ManagerNotifications_base: any;
/**
 * @memberof Homey
 * @namespace ManagerNotifications
 * @global
 */
declare class ManagerNotifications extends ManagerNotifications_base {
    [x: string]: any;
    /**
     * Create a notification
     * @param {Notification} notification
     * @param {genericCallbackFunction} callback
     */
    registerNotification(notification: Notification, callback: any): any;
}
