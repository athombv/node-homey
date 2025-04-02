'use strict';

/**
 * Cross-compilation platform identifiers.
 *
 * The value of each platform is used to identify, and also in the Zip file name. <appid>.<platform>.zip
 */
const HOMEY_PLATFORMS = {
  ALL: 'all',
  // ARM64 is used on Homey Pro 2023, Homey Cloud and app-runner on arm64 machines.
  MANYLINUX_ARM64: 'manylinux_arm64',
  // AMD64 is used on app-runners on x86_64 machines.
  MANYLINUX_AMD64: 'manylinux_amd64',
};

module.exports = {
  HOMEY_PLATFORMS,
};
