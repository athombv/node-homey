import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import fse from 'fs-extra';
import inquirer from 'inquirer';
import semver from 'semver';
import homeyLib from 'homey-lib';

const HomeyLibUtil = homeyLib.Util;

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);

export default class DeviceFirmwareUpdatesHelper {
  static async validateFirmwareFile({ firmwareFile, isZigbeeDriver }) {
    if (!fs.existsSync(firmwareFile)) {
      throw new Error(`Firmware file \`${firmwareFile}\` does not exist!`);
    }

    if (isZigbeeDriver) {
      try {
        await HomeyLibUtil.validateZigbeeOTAHeader({ filePath: firmwareFile });
      } catch (err) {
        throw new Error(`Invalid Zigbee OTA file: ${err.message}`);
      }
    }

    return firmwareFile;
  }

  static async collectChangelog() {
    return inquirer.prompt([
      {
        type: 'string',
        name: 'changelog',
        message: 'What is the changelog for this firmware update?',
        validate: (input) => input.length > 0,
      },
      {
        type: 'confirm',
        name: 'requireSpecificVersion',
        message:
          'Should this update only apply to devices within a certain firmware version range?',
        default: false,
      },
    ]);
  }

  static async collectZigbeeVersionConstraints() {
    const versions = await inquirer.prompt([
      {
        type: 'string',
        name: 'minFileVersion',
        message: 'What is the minimum file version required on the device to perform the update?',
        validate: (input) => {
          input = Number(input);

          if (Number.isNaN(input)) {
            return 'Minimum file version must be a number';
          }

          if (!Number.isInteger(input)) {
            return 'Minimum file version must be an integer';
          }

          if (input < 0 || input > 0xffff_ffff) {
            return 'Minimum file version must be a 32-bit unsigned integer';
          }

          return true;
        },
      },
      {
        type: 'string',
        name: 'maxFileVersion',
        message: 'What is the maximum file version required on the device to perform the update?',
        validate: (input) => {
          input = Number(input);

          if (Number.isNaN(input)) {
            return 'Maximum file version must be a number';
          }

          if (!Number.isInteger(input)) {
            return 'Maximum file version must be an integer';
          }

          if (input < 0 || input > 0xffff_ffff) {
            return 'Maximum file version must be a 32-bit unsigned integer';
          }

          return true;
        },
      },
    ]);

    return {
      minFileVersion: Number(versions.minFileVersion),
      maxFileVersion: Number(versions.maxFileVersion),
    };
  }

  static async collectZwaveApplicableTo() {
    const { applicableTo } = await inquirer.prompt([
      {
        type: 'string',
        name: 'applicableTo',
        message:
          'Enter a semver constraint to specify which device firmware versions this update should apply to (e.g. <2.0.0)',
        validate: (input) => {
          const validated = semver.validRange(input);
          return validated ? true : 'Please enter a valid semver constraint';
        },
      },
    ]);
    return applicableTo;
  }

  static async collectZigbeeDevice({ driverJson }) {
    const manufacturerNames = Array.isArray(driverJson.zigbee.manufacturerName)
      ? driverJson.zigbee.manufacturerName
      : [driverJson.zigbee.manufacturerName];
    const productIds = Array.isArray(driverJson.zigbee.productId)
      ? driverJson.zigbee.productId
      : [driverJson.zigbee.productId];

    const { selectedManufacturerNames, selectedProductIds } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedManufacturerNames',
        message: 'Which manufacturer names should this firmware update apply to?',
        choices: manufacturerNames,
        default: manufacturerNames,
        validate: (input) => {
          return input.length > 0 || 'Select at least one manufacturer name';
        },
      },
      {
        type: 'checkbox',
        name: 'selectedProductIds',
        message: 'Which product IDs should this firmware update apply to?',
        choices: productIds,
        default: productIds,
        validate: (input) => {
          return input.length > 0 || 'Select at least one product ID';
        },
      },
    ]);

    return {
      manufacturerName:
        selectedManufacturerNames.length === 1
          ? selectedManufacturerNames[0]
          : selectedManufacturerNames,
      productId: selectedProductIds.length === 1 ? selectedProductIds[0] : selectedProductIds,
    };
  }

  static async collectZwaveDevice({ driverJson }) {
    const toArray = (value) => {
      if (Array.isArray(value)) {
        return value;
      } else if (value !== undefined) {
        return [value];
      } else {
        return [];
      }
    };

    const manufacturerIds = toArray(driverJson.zwave.manufacturerId);
    const productTypeIds = toArray(driverJson.zwave.productTypeId);
    const productIds = toArray(driverJson.zwave.productId);

    const { selectedManufacturerIds, selectedProductTypeIds, selectedProductIds } =
      await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedManufacturerIds',
          message: 'Which manufacturer IDs should this firmware update apply to?',
          choices: manufacturerIds,
          default: manufacturerIds,
          validate: (input) => {
            return input.length > 0 || 'Select at least one manufacturer ID';
          },
        },
        {
          type: 'checkbox',
          name: 'selectedProductTypeIds',
          message: 'Which product type IDs should this firmware update apply to?',
          choices: productTypeIds,
          default: productTypeIds,
          validate: (input) => {
            return input.length > 0 || 'Select at least one product type ID';
          },
        },
        {
          type: 'checkbox',
          name: 'selectedProductIds',
          message: 'Which product IDs should this firmware update apply to?',
          choices: productIds,
          default: productIds,
          validate: (input) => {
            return input.length > 0 || 'Select at least one product ID';
          },
        },
      ]);

    return {
      manufacturerId:
        selectedManufacturerIds.length === 1 ? selectedManufacturerIds[0] : selectedManufacturerIds,
      productTypeId:
        selectedProductTypeIds.length === 1 ? selectedProductTypeIds[0] : selectedProductTypeIds,
      productId: selectedProductIds.length === 1 ? selectedProductIds[0] : selectedProductIds,
    };
  }

  static async collectZigbeeFileMetadata({ firmwarePath, minFileVersion, maxFileVersion }) {
    const header = await HomeyLibUtil.parseZigbeeOTAHeader(firmwarePath);
    const integrity = await HomeyLibUtil.getIntegrity(firmwarePath, 'sha256');
    const fileName = path.basename(firmwarePath);

    return {
      fileVersion: header.fileVersion,
      imageType: header.imageType,
      manufacturerCode: header.manufacturerCode,
      minFileVersion,
      maxFileVersion,
      maxHardwareVersion: header.maximumHardwareVersion,
      minHardwareVersion: header.minimumHardwareVersion,
      size: header.totalImageSize,
      name: fileName,
      integrity,
    };
  }

  static async collectZwaveFileMetadata({ firmwarePath }) {
    const { targetId, region } = await inquirer.prompt([
      {
        type: 'number',
        name: 'targetId',
        message: 'What is the chip target ID for this file?',
        default: 0,
        validate: (input) => {
          if (Number.isNaN(input)) {
            return 'Target ID must be a number';
          }

          if (!Number.isInteger(input)) {
            return 'Target ID must be an integer';
          }

          if (input < 0 || input > 255) {
            return 'Target ID must be between 0 and 255';
          }

          return true;
        },
      },
      {
        type: 'list',
        name: 'region',
        message: 'What is the region for this file?',
        choices: [
          { name: 'None/Global', value: null },
          { name: 'ANZ - Australia/New Zealand (919.8 MHz / 921.4 MHz)', value: 'ANZ' },
          { name: 'CN - China (868.4 MHz)', value: 'CN' },
          { name: 'EU - Europe (868.4 MHz / 869.85 MHz)', value: 'EU' },
          { name: 'HK - Hong Kong (919.8 MHz)', value: 'HK' },
          { name: 'IL - Israel (916 MHz)', value: 'IL' },
          { name: 'IN - India (865.2 MHz)', value: 'IN' },
          { name: 'JP - Japan (922.5 MHz / 923.9 MHz / 926.3 MHz)', value: 'JP' },
          { name: 'KR - Korea (920.9 MHz / 921.7 MHz / 923.1 MHz)', value: 'KR' },
          { name: 'RU - Russia (869 MHz)', value: 'RU' },
          // { name: 'US_LR - United States of America (Z-Wave & Long Range)', value: 'US_LR' },
          { name: 'US - United States of America (908.4 MHz / 916 MHz)', value: 'US' },
        ],
        default: null,
      },
    ]);

    const integrity = await HomeyLibUtil.getIntegrity(firmwarePath, 'sha256');
    const fileName = path.basename(firmwarePath);
    const { size } = await fs.promises.stat(firmwarePath);

    return {
      name: fileName,
      integrity,
      size,
      targetId,
      region: region !== null ? region : undefined,
    };
  }

  static async collectZwaveVersion() {
    const { version } = await inquirer.prompt([
      {
        type: 'string',
        name: 'version',
        message: 'What is the version of the firmware update?',
        validate: (input) => {
          if (input.length === 0) {
            return 'Version cannot be empty';
          }

          if (!semver.valid(input)) {
            return 'Please enter a valid semver version';
          }

          return true;
        },
      },
    ]);
    return version;
  }

  static async copyFirmwareFile({ firmwarePath, appPath, selectedDriverId }) {
    const fileName = path.basename(firmwarePath);
    const firmwareDestPath = path.join(
      appPath,
      'drivers',
      selectedDriverId,
      'assets',
      'firmware',
      fileName,
    );

    await fse.ensureDir(path.dirname(firmwareDestPath));
    await copyFileAsync(firmwarePath, firmwareDestPath);
  }

  static async collectSleepMode() {
    const { hasSleepMode } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasSleepMode',
        message: 'Does this device go into a sleep mode?',
        default: false,
      },
    ]);

    if (!hasSleepMode) {
      return { hasSleepMode };
    }

    const { wakeUpInstruction } = await inquirer.prompt([
      {
        type: 'string',
        name: 'wakeUpInstruction',
        message: 'Enter a short description on how to wake the device from sleep mode.',
        validate: (input) => input.length > 0,
      },
    ]);

    return { hasSleepMode, wakeUpInstruction };
  }

  static async readFirmwareUpdatesJson({ updatesFilePath }) {
    try {
      const content = await readFileAsync(updatesFilePath, 'utf8');
      const json = JSON.parse(content);

      if (
        typeof json !== 'object' ||
        json === null ||
        !json.updates ||
        !Array.isArray(json.updates)
      ) {
        throw new Error('Invalid firmware updates JSON: missing "updates" array');
      }

      return json;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { updates: [] };
      }
      throw new Error(
        `Error in \`driver.firmware.compose.json\` at \`${updatesFilePath}\`: ${err.message}`,
      );
    }
  }

  static async writeFirmwareUpdatesJson({ updatesFilePath, firmwareUpdatesJson }) {
    await writeFileAsync(updatesFilePath, JSON.stringify(firmwareUpdatesJson, null, 2));
  }
}
