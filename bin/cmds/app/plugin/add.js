'use strict';

const Log = require('../../../..').Log;
const App = require('../../../..').App;
const colors = require('colors');

exports.desc = 'Add a plugin to an Homey app';
exports.handler = async yargs => {
  
	const appPath = yargs.path || process.cwd();
  
	try {
		const app = new App( appPath );
		await app.addPluginCLI();
	} catch( err ) {
		Log(colors.red(err.message));
	}

}