export = InsightsLog;
/**
 * This class represents a Log in Insights.
 * This class should not be instanced manually, but retrieved using a method in {@link ManagerInsights} instead.
 * @hideconstructor
 */
declare class InsightsLog {
    private constructor(log: any, client: any);
    get name(): any;
    /**
     * Create an entry (logged value).
     * @param {number|boolean} value
     * @param {Date} [date] - Defaults to Date.now()
     * @returns {Promise<any>}
     */
    createEntry(value: number | boolean, date?: Date): Promise<any>;
    toJSON(): {
        name: any;
        options: any;
    };
}
