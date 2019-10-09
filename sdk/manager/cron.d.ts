export = ManagerCron;
declare const ManagerCron_base: any;
/**
 * @memberof Homey
 * @namespace ManagerCron
 * @global
 */
declare class ManagerCron extends ManagerCron_base {
    [x: string]: any;
    _initTask(task: any): any;
    __onInit(): void;
    _tasks: {};
    _onRunTask(task: any): void;
    /**
     * Get all tasks belonging to this app.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Array} callback.logs - An array of {@link CronTask} instances
     * @returns {Promise}
     */
    getTasks(callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Get a specific task belonging to this app.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {CronTask} callback.task
     * @returns {Promise}
     */
    getTask(id: string, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Create a task.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @param {Date|String} when - The run date or interval. When provided a Date, the task will run once and automatically unregister. When provided a string in the cron-format (e.g. `* * * * * *` will trigger every second), the task will run forever.
     * @param {Object} data
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {CronTask} callback.task
     * @returns {Promise}
     */
    registerTask(id: string, when: string | Date, data: any, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Unregister a specific task.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @returns {Promise}
     */
    unregisterTask(id: string, callback?: Function): Promise<any>;
    /**
     * Unregister all tasks.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @returns {Promise}
     */
    unregisterAllTasks(callback?: Function): Promise<any>;
}
