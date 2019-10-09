import Manager = require("../lib/Manager");

export = ManagerSpeechOutput;
/**
 * @memberof Homey
 * @namespace ManagerSpeechOutput
 * @global
 */
declare class ManagerSpeechOutput extends Manager {
    /**
     * Let Homey say something. There is a limit of 255 characters.
     * @permission homey:manager:speech-output
     * @param {string} text - The sentence to say
     * @param {Object} opts
     * @param {Object} opts.session - The session of the speech. Leave empty to use Homey's built-in speaker
     * @returns {Promise<any>}
     * @example
     * const Homey = require('homey');
     * Homey.ManagerSpeechOutput.say('Hello world!')
     *    .then( this.log )
     *    .catch( this.error );
     */
    say(text: string, opts: {
        session: any;
    }): Promise<any>;
}
