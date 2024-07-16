'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Translate a Homey App with OpenAI';
exports.builder = yargs => {
  return yargs
    .option('languages', {
      default: ['nl', 'da', 'de', 'es', 'fr', 'it', 'no', 'sv', 'pl', 'ru', 'ko'].join(','),
      type: 'string',
      description: 'Comma-seperated list of languages to translate to.',
    })
    .option('api-key', {
      default: process.env.OPENAI_API_KEY,
      type: 'string',
      description: 'OpenAI API key. You can create an API Key on https://platform.openai.com/api-keys.',
    });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.translateWithOpenAI({
      languages: yargs.languages.split(',').map(lang => lang.trim()),
      apiKey: yargs.apiKey,
    });
    await app.preprocess();
    await app.validate({
      level: yargs.level,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
