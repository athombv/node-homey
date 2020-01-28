#!/usr/bin/env node

'use strict';

const pkg = require('../package.json');
const yargs = require('yargs');
const updateNotifier = require('update-notifier');
const AthomMessage = require('..').AthomMessage;
const REQUIRED_NODE_VERSION = '10.10';

try {
	let version = process.version;
	if( version.indexOf('v') === 0 ) version = version.substr(1);
	version = version.split('.');

	let majorVersion = version[0];
	majorVersion = parseInt(majorVersion);

	let minorVersion = version[1];
	minorVersion = parseInt(minorVersion);

	if( majorVersion < 10 || ( majorVersion === 10 && minorVersion < 10 ) )
		return console.error(`Error: node-homey requires Node.js v${REQUIRED_NODE_VERSION} or higher to run. Please upgrade your Node.js version and try again.`);

} catch( err ) {
	console.error(`Failed to determine Node.js version, please make sure you\'re using version ${REQUIRED_NODE_VERSION} or higher.`);
}

(async () => {

	await AthomMessage.notify();
	updateNotifier({ pkg }).notify({
		isGlobal: true,
	});

	yargs
		.commandDir('./cmds')
		.demandCommand()
		.strict()
		.help()
		.argv;

})();