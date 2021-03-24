'use strict';

const Log = require('../../..').Log;
const App = require('../../..').App;
const colors = require('colors');

exports.desc = 'Install the Apps SDK TypeScript declarations';
exports.handler = async yargs => {
	
	const appPath = yargs.path || process.cwd();

	try {
		await App.addTypes({ appPath });
	} catch( err ) {
		Log(colors.red(err.message));
	}

}