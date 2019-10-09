import Manager = require("../lib/Manager");
import InsightsLog = require("../lib/InsightsLog");

export = ManagerInsights;
declare const ManagerInsights_base: any;
/**
 * @memberof Homey
 * @namespace ManagerInsights
 * @global
 */
declare class ManagerInsights extends Manager {
    /**
     * Get all logs belonging to this app.
     * @returns {Promise<InsightsLog[]>} An array of {@link InsightsLog} instances
     */
    getLogs(): Promise<InsightsLog[]>;
    /**
     * Get a specific log belonging to this app.
     * @param {string} id - ID of the log (must be lowercase, alphanumeric)
     * @returns {Promise<InsightsLog>}
     */
    getLog(id: string): Promise<InsightsLog>;
    /**
     * Create a log.
     * @param {string} id - ID of the log (must be lowercase, alphanumeric)
     * @param {Object} options
     * @param {string} options.title - Log's title
     * @param {string} options.type - Value type, can be either <em>number</em> or <em>boolean</em>
     * @param {string} [options.chart] - Chart type, can be either <em>line</em>, <em>area</em>, <em>stepLine</em>, <em>column</em>, <em>spline</em>, <em>splineArea</em> or <em>scatter</em>
     * @param {string} [options.units] - Units of the values, e.g. <em>°C</em>
     * @param {number} [options.decimals] - Number of decimals visible
     * @returns {Promise<InsightsLog>}
     */
    createLog(id: string, options: {
        title: string;
        type: string;
        chart?: string;
        units?: string;
        decimals?: number;
    }): Promise<InsightsLog>;
    /**
     * Delete a log.
     * @param {InsightsLog} log
     * @returns {Promise<any>}
     */
    deleteLog(log: InsightsLog): Promise<any>;
}
