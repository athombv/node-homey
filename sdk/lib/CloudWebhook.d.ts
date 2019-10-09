import SimpleClass = require("./SimpleClass");

export = CloudWebhook;

/**
 * A webhook class that can receive incoming messages
 */
declare class CloudWebhook extends SimpleClass {
    /**
     * @param {string} id - Webhook ID
     * @param {string} secret - Webhook Secret
     * @param {Object} data - Webhook Data
     */
    constructor(id: string, secret: string, data: any);
    /**
     * This event is fired when a webhook message has been received.
     * @event CloudWebhook#message
     * @param {Object} args
     * @param {Object} args.headers - Received HTTP headers
     * @param {Object} args.query - Received HTTP query string
     * @param {Object} args.body - Received HTTP body
     */
    _onMessage(args: {
        headers: any;
        query: any;
        body: any;
    }): void;
    /**
     * Register the webhook.
     * This is a shortcut for {@link ManagerCloud#registerWebhook}
     * @returns {Promise<any>}
     */
    register(): Promise<any>;
    /**
     * Unregister the webhook.
     * This is a shortcut for {@link ManagerCloud#unregisterWebhook}
     * @returns {Promise<any>}
     */
    unregister(): Promise<any>;
    toJSON(): {
        id: string;
        secret: string;
        data: any;
    };
}
