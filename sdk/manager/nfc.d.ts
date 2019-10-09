export = ManagerNFC;
declare const ManagerNFC_base: any;
/**
 * @memberof Homey
 * @namespace ManagerNFC
 * @global
 */
declare class ManagerNFC extends ManagerNFC_base {
    [x: string]: any;
    __onInit(): void;
    /**
     * This event is fired when a tag has been found.
     * @param {Object} tag - The arguments as provided by the user in the Flow Editor
     * @param {Object} tag.uid - The UID of the tag
     * @event ManagerNFC#tag
     */
    _onTag(tag: {
        uid: any;
    }): void;
}
