export = ManagerInsights;
declare const ManagerInsights_base: any;
/**
 * @memberof Homey
 * @namespace ManagerInsights
 * @global
 */
declare class ManagerInsights extends ManagerInsights_base {
    [x: string]: any;
    _initLog(logObj: any): any;
    _onLogEmit(id: any, event: any, obj: any, callback: any): any;
    /**
     * Get all logs belonging to this app.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Array} callback.logs - An array of {@link InsightsLog} instances
     * @returns {Promise}
     */
    getLogs(callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Get a specific log belonging to this app.
     * @param {string} id - ID of the log (must be lowercase, alphanumeric)
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {InsightsLog} callback.log
     * @returns {Promise}
     */
    getLog(id: string, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Create a log.
     * @param {string} id - ID of the log (must be lowercase, alphanumeric)
     * @param {Object} options
     * @param {string} options.title - Log's title
     * @param {string} options.type - Value type, can be either <em>number</em> or <em>boolean</em>
     * @param {string} [options.chart] - Chart type, can be either <em>line</em>, <em>area</em>, <em>stepLine</em>, <em>column</em>, <em>spline</em>, <em>splineArea</em> or <em>scatter</em>
     * @param {string} [options.units] - Units of the values, e.g. <em>°C</em>
     * @param {number} [options.decimals] - Number of decimals visible
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {InsightsLog} callback.log
     * @returns {Promise}
     */
    createLog(id: string, options: {
        title: string;
        type: string;
        chart?: string;
        units?: string;
        decimals?: number;
    }, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Delete a log.
     * @param {InsightsLog} log
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    deleteLog(log: any, callback?: any): Promise<any>;
}
