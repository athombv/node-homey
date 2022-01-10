'use strict';

const colors = require('chalk');
const { Log } = require('../../index');
const { AthomApi } = require('../../index');

exports.desc = 'List all Homeys';
exports.handler = async () => {
  try {
    const homeys = await AthomApi.getHomeys();

    homeys.sort((a, b) => {
      return -(a.state || '').localeCompare((b.state || ''));
    });

    const table = {};
    for (const homey of homeys) {
      table[homey._id] = {
        Name: homey.name,
        Version: homey.softwareVersion ? homey.softwareVersion : '-',
        API: homey.apiVersion ? homey.apiVersion : '-',
        Language: homey.language ? homey.language : '-',
        Users: homey.users && homey.users.length,
        Role: homey.role ? homey.role : '-',
        USB: homey.usb ? 'Yes' : '-',
      };
    }

    // eslint-disable-next-line no-console
    console.table(table);
  } catch (err) {
    Log(colors.red(err.message));
  }
};
