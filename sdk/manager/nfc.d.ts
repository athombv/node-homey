import Manager = require("../lib/Manager");

export = ManagerNFC;
/**
 * @memberof Homey
 * @namespace ManagerNFC
 * @global
 */
declare class ManagerNFC extends Manager {
    /**
     * This event is fired when a tag has been found.
     * @param {Object} tag - The arguments as provided by the user in the Flow Editor
     * @param {Object} tag.uid - The UID of the tag
     * @event ManagerNFC#tag
     */
}
