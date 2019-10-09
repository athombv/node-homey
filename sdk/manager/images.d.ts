import Manager = require("../lib/Manager");
import Image = require("../lib/Image");

export = ManagerImages;
/**
 * @memberof Homey
 * @namespace ManagerImages
 * @tutorial Images
 * @global
 */
declare class ManagerImages extends Manager {
    /**
     * Get a registered {@link Image}.
     * @param {String} id
     * @returns {Image|Error}
     */
    getImage(id: string): Image | Error;
    /**
     * Register a {@link Image}.
     * @param {Image} imageInstance
     * @returns {Promise<Image>}
     */
    registerImage(imageInstance: Image): Promise<Image>;
    /**
     * Unregister a {@link Image}.
     * @param {Image} imageInstance
     * @returns {Promise<void>}
     */
    unregisterImage(imageInstance: Image): Promise<void>;
}
