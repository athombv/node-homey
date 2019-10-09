import Manager = require("../lib/Manager");

export = ManagerSpeechInput;
/**
 * @memberof Homey
 * @namespace ManagerSpeechInput
 * @global
 */
declare class ManagerSpeechInput extends Manager {
    /**
     * This event is fired when a speech query has been received, and needs feedback.
     * @event ManagerSpeechInput#speechEval
     * @param {Object} speech - Information about what the user said
     * @param {string} speech.session - The session where the speech command originated from
     * @param {string} speech.transcript - The detected user thrase
     * @param {Object} speech.matches - a dynamically generated tree containing all the matched Groups and Elements
     * @param {Array} speech.words - An array of Objects, where each Object contains the word's properties
     * @param {string} speech.words[].word - The word
     * @param {string} speech.words[].posTag - The part-of-speech tag assigned to the word, using universal dependencies tagset
     * @param {Object} speech.words[].chunks - lists any chunks starting at this word. Stuctured the same as the Object in speech.chunks[]
     * @param {Object} speech.words[].locations - lists any locations starting at this word. Stuctured the same as the Object in speech.locations[]
     * @param {Object} speech.words[].times - lists any times starting at this word. Stuctured the same as the Object in speech.times[]
     * @param {Object} speech.words[].devices - lists any device mentions starting at this word. Stuctured the same as the Object in speech.devices[]
     * @param {Array} speech.chunks - An array of detected noun phrases and verb phrases
     * @param {string} speech.chunks[].transcript - The chunk text
     * @param {number} speech.chunks[].startWord - The index of the words array where the chunk starts
     * @param {number} speech.chunks[].endWord - The index of the words array where the chunk ends
     * @param {string} speech.chunks[].type - The chunk type - either NP (Noun Phrase) or VP (Verb Phrase)
     * @param {Array} speech.locations - An array of detected references to a location
     * @param {string} speech.locations[].transcript - The location name
     * @param {number} speech.locations[].startWord - The index of the words array where the location starts
     * @param {number} speech.locations[].endWord - The index of the words array where the location ends
     * @param {Array} speech.times - An array of detected time references
     * @param {string} speech.times[].transcript - The time text
     * @param {number} speech.times[].startWord - The index of the words array where the time mention starts
     * @param {number} speech.times[].endWord - The index of the words array where the time mention ends
     * @param {Object} speech.times[].time - The chunk type - either NP (Noun Phrase) or VP (Verb Phrase)
     * @param {number} speech.times[].time[].second - Seconds. False if no reference to a specific second was made
     * @param {number} speech.times[].time[].minute - Minutes. False if no reference to a specific minute was made
     * @param {number} speech.times[].time[].hour - Hour of the day. False if no reference to a specific hour was made
     * @param {boolean} speech.times[].time[].fuzzyHour - Indicates whether there is uncertainty about a time being am or pm. True if there is uncertainty, false if the part of day was indicated
     * @param {number} speech.times[].time[].day - Day of the month. False if no reference to a specific day was made
     * @param {number} speech.times[].time[].month - Month number. 0 is january. False if no reference to a specific month was made
     * @param {number} speech.times[].time[].year - Year. False if no reference to a specific year was made
     * @param {Array} speech.devices - An array of {@link Device} instances which match the device parameters specified in app.json
     * @param {string} speech.allZones - A structured phrase which can be used to provide user feedback about the detected Zone names. Format: "in the {zone_name}(, {zone_name})*( and the {zone_name})?"
     * @param {genericCallbackFunction} callback - A truthy response is used to indicate that your App can process this transcript. The returned value will be passed on to the onSpeechMatch event
     */

     /**
     * @event ManagerSpeechInput#speechMatch
     * @param {Object} speech - Information about what the user said
     * @param {string} speech.session - The session where the speech command originated from
     * @param {string} speech.transcript - The detected user thrase
     * @param {Object} speech.matches - a dynamically generated tree containing all the matched Groups and Elements
     * @param {Array} speech.words - An array of Objects, where each Object contains the word's properties
     * @param {string} speech.words[].word - The word
     * @param {string} speech.words[].posTag - The part-of-speech tag assigned to the word, using universal dependencies tagset
     * @param {Object} speech.words[].chunks - lists any chunks starting at this word. Stuctured the same as the Object in speech.chunks[]
     * @param {Object} speech.words[].locations - lists any locations starting at this word. Stuctured the same as the Object in speech.locations[]
     * @param {Object} speech.words[].times - lists any times starting at this word. Stuctured the same as the Object in speech.times[]
     * @param {Object} speech.words[].devices - lists any device mentions starting at this word. Stuctured the same as the Object in speech.devices[]
     * @param {Array} speech.chunks - An array of detected noun phrases and verb phrases
     * @param {string} speech.chunks[].transcript - The chunk text
     * @param {number} speech.chunks[].startWord - The index of the words array where the chunk starts
     * @param {number} speech.chunks[].endWord - The index of the words array where the chunk ends
     * @param {string} speech.chunks[].type - The chunk type - either NP (Noun Phrase) or VP (Verb Phrase)
     * @param {Array} speech.locations - An array of detected references to a location
     * @param {string} speech.locations[].transcript - The location name
     * @param {number} speech.locations[].startWord - The index of the words array where the location starts
     * @param {number} speech.locations[].endWord - The index of the words array where the location ends
     * @param {Array} speech.times - An array of detected time references
     * @param {string} speech.times[].transcript - The time text
     * @param {number} speech.times[].startWord - The index of the words array where the time mention starts
     * @param {number} speech.times[].endWord - The index of the words array where the time mention ends
     * @param {Object} speech.times[].time - The chunk type - either NP (Noun Phrase) or VP (Verb Phrase)
     * @param {number} speech.times[].time[].second - Seconds. False if no reference to a specific second was made
     * @param {number} speech.times[].time[].minute - Minutes. False if no reference to a specific minute was made
     * @param {number} speech.times[].time[].hour - Hour of the day. False if no reference to a specific hour was made
     * @param {boolean} speech.times[].time[].fuzzyHour - Indicates whether there is uncertainty about a time being am or pm. True if there is uncertainty, false if the part of day was indicated
     * @param {number} speech.times[].time[].day - Day of the month. False if no reference to a specific day was made
     * @param {number} speech.times[].time[].month - Month number. 0 is january. False if no reference to a specific month was made
     * @param {number} speech.times[].time[].year - Year. False if no reference to a specific year was made
     * @param {Array} speech.devices - An array of {@link Device} instances which match the device parameters specified in app.json
     * @param {string} speech.allZones - A structured phrase which can be used to provide user feedback about the detected Zone names. Format: "in the {zone_name}(, {zone_name})*( and the {zone_name})?"
     * @param {ManagerSpeechOutput#say} speech.say - A shorthand method to say something, with the correct session
     * @param {ManagerSpeechInput#ask} speech.ask - A shorthand method to ask a question, with the correct session
     * @param {ManagerSpeechInput#confirm} speech.confirm - A shorthand method to ask a Yes/No question, with the correct session
     * @param {*} onSpeechData The result from {@link ManagerSpeechInput#event:speechEval speechEval}
     */

     /**
     * Let Homey ask a question. There is a limit of 255 characters.
     * @permission homey:manager:speech-input
     * @permission homey:manager:speech-output
     * @param {string} text - The sentence to say
     * @param {Object} opts
     * @param {Object} [opts.session] - The session of the speech. Leave empty to use Homey's built-in speaker
     * @param {number} [opts.timeout] - Amount of seconds until the response has timed-out
     * @returns {Promise<string>} - The text of the answer
     */
    ask(text: string, opts: {
        session?: any;
        timeout?: number;
    }): Promise<string>;
    /**
     * Let Homey ask a Yes/No question. There is a limit of 255 characters.
     * @permission homey:manager:speech-input
     * @permission homey:manager:speech-output
     * @param {string} text - The sentence to say
     * @param {Object} opts
     * @param {Object} [opts.session] - The session of the speech. Leave empty to use Homey's built-in speaker
     * @param {number} [opts.timeout] - Amount of seconds until the response has timed-out
     * @returns {Promise<boolean>} - Indicating whether the user answered with yes (true) or no (false)
     */
    confirm(text: string, opts: {
        session?: any;
        timeout?: number;
    }): Promise<boolean>;
}
