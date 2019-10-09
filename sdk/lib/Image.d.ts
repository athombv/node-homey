import { Writable } from "stream";

export = Image;

type ImageStreamMetadata = {
    /** A filename for this image */
    filename: string;
    /** The mime type of this image */
    contentType: string;
    /** The size in bytes, if available */
    contentLength?: number;
};

/**
 * The Image class can be used to create an Image, which can be used in the Flow Editor.
 * An image must be registered, and the contents will be retrieved when needed.
 * @property {string} cloudUrl - The public URL to this image using Athom's cloud proxy (HTTPS)
 * @property {string} localUrl - The public URL to this image using Homey's local IP address (HTTP)
 */
declare class Image {
    constructor();
    /**
     * Register the image.
     * This is a shorthand method for {@link ManagerImages#registerImage}.
     * @returns {Promise<Image>}
     */
    register(): Promise<Image>;
    /**
     * Unregister the image.
     * This is a shorthand method for {@link ManagerImages#unregisterImage}.
     */
    unregister(): Promise<any>;
    /**
     * Pipe the image into the target stream and returns metadata.
     * @param {Writable} target
     * @return {ImageStreamMetadata} Stream metadata
     * @since 2.2.0
     */
    pipe(stream: Writable): ImageStreamMetadata;
    /**
     * Returns a stream containing the image data.
     * @return {Readable} A nodejs stream containing the image data. The readable stream contains metadata properties ({@link Image#ImageStreamMetadata})
     * @since 2.2.0
     */
    getStream(): any;
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
     * @returns {Promise<any>}
     */
    update(): Promise<any>;
    toJSON(): string;
}
