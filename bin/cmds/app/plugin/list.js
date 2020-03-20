'use strict';

const Log = require('../../../..').Log;
const App = require('../../../..').App;
const colors = require('colors');

exports.desc = 'List all plugins for this Homey app';
exports.handler = async yargs => {
  
	const appPath = yargs.path || process.cwd();
  
	try {
		const app = new App( appPath );
		await app.listPlugins();
	} catch( err ) {
		Log(colors.red(err.message));
	}

}