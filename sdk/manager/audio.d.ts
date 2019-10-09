export = ManagerAudio;
declare const ManagerAudio_base: any;
/**
 * @memberof Homey
 * @namespace ManagerAudio
 * @global
 */
declare class ManagerAudio extends ManagerAudio_base {
    [x: string]: any;
    /**
     * Play WAV audio sample
     * @param {string} sampleId unique id which can be used to play sounds that have been played before
     * @param {Buffer|string} [sample] Buffer containing a WAV audio sample or path to file containing WAV audio sample data.
     * Sample is cached in Homey and can be played again by calling this function with the same sampleId without the sample argument which will result in the the sample loading faster.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    playWav(sampleId: string, sample?: any, callback?: any): any;
    /**
     * Play MP3 audio sample
     * @param {string} sampleId unique id which can be used to play sounds that have been played before
     * @param {Buffer|string} [sample] Buffer containing a MP3 audio sample or path to file containing MP3 audio sample data.
     * Sample is cached in Homey and can be played again by calling this function with the same sampleId without the sample argument which will result in the the sample loading faster.
     * @param {genericCallbackFunction} [callback]
     * @returns Promise
     */
    playMp3(sampleId: string, sample?: any, callback?: any): any;
    /**
     * Remove WAV sample from cache
     * @param {string} sampleId The id of the WAV that is cached
     * @param {genericCallbackFunction} [callback]
     */
    removeWav(sampleId: string, callback?: any): any;
    /**
     * Remove MP3 sample from cache
     * @param {string} sampleId The id of the MP3 that is cached
     * @param {genericCallbackFunction} [callback]
     */
    removeMp3(sampleId: string, callback?: any): any;
}
