export = SimpleClass;
/**
 * This is a simple class, extended by many other classes.
 * @extends EventEmitter
 */
declare class SimpleClass {
    /**
     * Log a message to the console (stdout)
     * @param {...*} message
     */
    log(...args: any[]): void;
    /**
     * Log a message to the console (stderr)
     * @param {...*} message
     */
    error(...args: any[]): void;
    __debug(...args: any[]): void;
}
