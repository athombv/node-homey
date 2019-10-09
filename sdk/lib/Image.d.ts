export = Image;
/**
 * @typedef Image#ImageStreamMetadata
 * @property {string} filename - A filename for this image
 * @property {string} contentType - The mime type of this image
 * @property {number} [contentLength] - The size in bytes, if available
 */
/**
 * The Image class can be used to create an Image, which can be used in the Flow Editor.
 * An image must be registered, and the contents will be retrieved when needed.
 * @property {string} cloudUrl - The public URL to this image using Athom's cloud proxy (HTTPS)
 * @property {string} localUrl - The public URL to this image using Homey's local IP address (HTTP)
 */
declare class Image {
    constructor(format: any, id: any, client: any);
    id: any;
    __client: any;
    /**
     * Register the image.
     * This is a shorthand method for {@link ManagerImages#registerImage}.
     * @param {Function} [callback]
     * @param {Error} callback.err
     * @param {Image} callback.image
     * @returns {Promise}
     */
    register(callback?: Function): Promise<any>;
    /**
     * Unregister the image.
     * This is a shorthand method for {@link ManagerImages#unregisterImage}.
     * @param {genericCallbackFunction} [callback]
     * @returns {Promise}
     */
    unregister(callback?: any): Promise<any>;
    _pipe(_stream: any): Promise<{}>;
    __emitDeprecatedWarning(): void;
    _validateBuffer(buf: any): string | false;
    get format(): string;
    /**
     * Get the format
     * @returns {String} format Either `png`, `jpg` or `gif`
     * @deprecated Use {@link Image#ImageStreamMetadata} properties through {@link Image#getStream} and {@link Image#pipe}
     */
    getFormat(): string;
    /**
     * Get the Buffer
     * @param {Function} callback
     * @param {Error} callback.err
     * @param {Buffer} callback.data
     * @returns {Promise}
     * @deprecated Use {@link Image#getStream} or {@link Image#pipe}
     */
    getBuffer(callback: Function, ...args: any[]): Promise<any>;
    /**
     * Pipe the image into the target stream and returns metadata.
     * @param {WritableStream} target
     * @return {Image#ImageStreamMetadata} Stream metadata
     * @since 2.2.0
     */
    pipe(stream: any): import("./Image");
    /**
     * Returns a stream containing the image data.
     * @return {Readable} A nodejs stream containing the image data. The readable stream contains metadata properties ({@link Image#ImageStreamMetadata})
     * @since 2.2.0
     */
    getStream(): any;
    /**
     * Set the image's data
     * @param {Buffer|Function} source - A buffer of the image, or a Function. When provided a function, this will be called with parameters `(args, callback)` when someone requests the buffer. This is mostly useful for external image sources.
     * @deprecated Use {@link Image#setStream}
     */
    setBuffer(source: any): void;
    _type: string;
    _source: any;
    /**
     * Set the image's data.
     * @param {Function} source - This function will be called with the parameter `(stream)` when someone pipes this image. Pipe the image content to the stream. This is mostly useful for external image sources.
     * @since 2.2.0
     * @tutorial Images
     */
    setStream(streamFn: any): void;
    /**
     * Set the image's path
     * @param {String} path - Relative path to your image, e.g. `/userdata/kitten.jpg`
     */
    setPath(path: string): void;
    /**
     * Set the image's URL. This URL must be accessible from any network.
     * @param {String} url - Absolute url, `https://`
     */
    setUrl(url: string): void;
    /**
     * Notify that the image's contents have changed
     * @param callback
     * @param {Error} callback.err
     * @returns {Promise}
     */
    update(callback: any): Promise<any>;
    toJSON(): string;
}
declare namespace Image {
    export { Image };
}
/**
 * #ImageStreamMetadata
 */
type Image = {
    /**
     * - A filename for this image
     */
    filename: string;
    /**
     * - The mime type of this image
     */
    contentType: string;
    /**
     * - The size in bytes, if available
     */
    contentLength?: number;
};
