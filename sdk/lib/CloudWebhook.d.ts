export = CloudWebhook;
declare const CloudWebhook_base: any;
/**
 * A webhook class that can receive incoming messages
 */
declare class CloudWebhook extends CloudWebhook_base {
    [x: string]: any;
    /**
     * @param {string} id - Webhook ID
     * @param {string} secret - Webhook Secret
     * @param {Object} data - Webhook Data
     */
    constructor(id: string, secret: string, data: any);
    id: string;
    secret: string;
    data: any;
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
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    register(callback?: any): Promise<any>;
    /**
     * Unregister the webhook.
     * This is a shortcut for {@link ManagerCloud#unregisterWebhook}
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregister(callback?: any): Promise<any>;
    toJSON(): {
        id: string;
        secret: string;
        data: any;
    };
}
