'use strict';

const crypto = require('crypto');

const fse = require('fs-extra');

module.exports = class Util {

  static md5(input) {
    return crypto
      .createHash('md5')
      .update(input)
      .digest('hex');
  }

  static async getFileHash(filepath, algorithm = 'md5') {
    const buf = await fse.readFile(filepath);

    if (algorithm === 'md5') {
      const md5 = this.md5(buf);
      return md5;
    }

    throw new Error(`Unknown Algorithm: ${algorithm}`);
  }

}