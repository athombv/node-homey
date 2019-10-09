export = ManagerImages;
declare const ManagerImages_base: any;
/**
 * @memberof Homey
 * @namespace ManagerImages
 * @tutorial Images
 * @global
 */
declare class ManagerImages extends ManagerImages_base {
    [x: string]: any;
    __onInit(): void;
    _images: {};
    __onPipe(data: any, callback: any): any;
    __onImageEmit(imageId: any, event: any, args: any, callback: any): any;
    /**
     * Get a registered {@link Image}.
     * @param {String} id
     * @returns {Image|Error}
     */
    getImage(id: string): any;
    /**
     * Register a {@link Image}.
     * @param {Image} imageInstance
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Image} callback.image
     * @returns {Promise}
     */
    registerImage(imageInstance: any, callback?: Function, ...args: any[]): Promise<any>;
    /**
     * Unregister a {@link Image}.
     * @param {Image} imageInstance
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregisterImage(imageInstance: any, callback?: any, ...args: any[]): Promise<any>;
}
