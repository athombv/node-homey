export = CronTask;
declare const CronTask_base: any;
/**
 * This class should not be instanced manually, but retrieved using a method in {@link ManagerCron} instead.
 * @hideconstructor
 */
declare class CronTask extends CronTask_base {
    private constructor(task: any);
    /**
     * This event is fired when the task runs
     * @event CronTask#run
     * @param {Object} data - The data object as provided at {@link ManagerCron#registerTask}.
     */
}
