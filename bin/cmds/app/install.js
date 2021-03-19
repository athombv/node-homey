'use strict';

const Log = require('../../..').Log;
const App = require('../../..').App;
const AthomApi = require('../../..').AthomApi;
const colors = require('colors');

exports.desc = 'Install a Homey App';
exports.builder = yargs => {
	return yargs
		.option('clean', {
			alias: 'c',
			type: 'boolean',
			default: false,
		})
		.option('skip-build', {
			alias: 's',
			type: 'boolean',
			default: false,
		});
}
exports.handler = async yargs => {

	const appPath = yargs.path || process.cwd();

	try {
    const homey = await AthomApi.getActiveHomey();
		const app = new App( appPath );
		await app.install({
			homey,
			clean: yargs.clean,
			skipBuild: yargs.skipBuild,
		});
	} catch( err ) {
		Log(colors.red(err.message));
	}

}