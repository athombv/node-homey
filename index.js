'use strict';

const figures = require('figures');
const Settings = require('./lib/Settings');
const AthomApi = require('./lib/AthomApi');
const AthomMessage = require('./lib/AthomMessage');
const Util = require('./lib/Util');
const App = require('./lib/App');

module.exports.Log = (...props) => {
  console.log(figures(...props));
};

module.exports.Util = Util;
module.exports.Settings = new Settings();
module.exports.AthomApi = new AthomApi();
module.exports.AthomMessage = new AthomMessage();
module.exports.App = App;
