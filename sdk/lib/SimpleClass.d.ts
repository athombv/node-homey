import { EventEmitter } from "events";

export = SimpleClass;
/**
 * This is a simple class, extended by many other classes.
 * @extends EventEmitter
 */
declare class SimpleClass extends EventEmitter {
    /**
     * Log a message to the console (stdout)
     * @param {...*} args
     */
    log(...args: any[]): void;
    /**
     * Log a message to the console (stderr)
     * @param {...*} args
     */
    error(...args: any[]): void;
}
