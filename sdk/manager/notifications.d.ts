import Manager = require("../lib/Manager");
import Notification = require("../lib/Notification");

export = ManagerNotifications;
/**
 * @memberof Homey
 * @namespace ManagerNotifications
 * @global
 */
declare class ManagerNotifications extends Manager {
    /**
     * Create a notification
     * @param {Notification} notification
     * @returns {Promise<any>}
     */
    registerNotification(notification: Notification): Promise<any>;
}
