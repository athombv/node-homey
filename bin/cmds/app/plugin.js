'use strict';

exports.desc = 'Plugin related commands';
exports.builder = yargs => {
	return yargs
		.commandDir('plugin')
		.demandCommand()
		.help()	
}