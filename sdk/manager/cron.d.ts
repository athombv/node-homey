import Manager = require("../lib/Manager");
import CronTask = require("../lib/CronTask");

export = ManagerCron;
/**
 * @memberof Homey
 * @namespace ManagerCron
 * @global
 */
declare class ManagerCron extends Manager {
    /**
     * Get all tasks belonging to this app.
     * @returns {Promise<CronTask[]>} resolves to an array of {@link CronTask} instances
     */
    getTasks(): Promise<CronTask[]>;
    /**
     * Get a specific task belonging to this app.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @returns {Promise<CronTask>}
     */
    getTask(id: string): Promise<CronTask>;
    /**
     * Create a task.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @param {Date|String} when - The run date or interval. When provided a Date, the task will run once and automatically unregister. When provided a string in the cron-format (e.g. `* * * * * *` will trigger every second), the task will run forever.
     * @param {Object} data
     * @returns {Promise<CronTask>}
     */
    registerTask(id: string, when: string | Date, data: any): Promise<CronTask>;
    /**
     * Unregister a specific task.
     * @param {string} id - ID of the task (must be lowercase, alphanumeric).
     * @returns {Promise<never>}
     */
    unregisterTask(id: string): Promise<never>;
    /**
     * Unregister all tasks.
     * @returns {Promise<never>}
     */
    unregisterAllTasks(): Promise<never>;
}
