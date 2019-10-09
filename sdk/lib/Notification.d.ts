export = Notification;
/**
 * This class holds a Homey Notification.
 */
declare class Notification {
    /**
     * @param {Object} options
     * @param {string} options.excerpt - A short message describing the notification. Use *asterisks* to highlight variable words.
     */
    constructor(options: {
        excerpt: string;
    });
    /**
     * Register the notification.
     * This is a shorthand method for <code>ManagerNotifications.registerNotification()</code>.
     * @returns {Promise<any>}
     */
    register(): Promise<any>;
    toJSON(): {
        excerpt: string;
    };
}
