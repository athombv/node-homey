/**
 * AppFactory is responsible for retrieving the app instance.
 *
 * This factory automatically determines if the app instance should be using runtime 'Node.js' or 'Python'
 *
 * This Factory is also responsible for the creation of a app instance (and asking some questions)
 *
 * We kept the App.js file original, to prevent breaking the working code. For the Python runtime, there is a copy named 'AppPython.js'.
 * We thought about making App.js a abstract class, and creating both 'AppPython.js' and 'AppNode.js',
 * but that idea was rejected, because it would complicate things more and it would touch the existing code too much.
 */

'use strict';

const fs = require('fs');
const { promisify } = require('util');
const inquirer = require('inquirer');

const HomeyLibApp = require('homey-lib').App;

const AppProject = require('./AppProject');
const App = require('./App');
const AppPython = require('./AppPython');

const statAsync = promisify(fs.stat);

class AppFactory {

  // List of all recognized runtimes
  // Used to determine what App instance corresponds to the manifest 'runtime' field
  static #recognizedRuntimes = new Map([
    ['node', App],
    ['python', AppPython],
  ]);

  /**
   * Get the App class for the runtime of the current project
   * @param {string} appPath Path to root-folder of the App
   * @returns {App | AppPython} The app instance
   */
  static getAppInstance(appPath) {
    const runtime = AppFactory.#checkRuntime(appPath);

    const AppClass = AppFactory.#recognizedRuntimes.get(runtime);
    return new AppClass(appPath);
  }

  /**
   * Check runtime
   * @param {string} appPath Path to root-folder of the App
   * @returns {"node" | "python"} the runtime
   * @private
   */
  static #checkRuntime(appPath) {
    // Check the dominant manifest.
    let manifest;
    if (AppProject.hasHomeyCompose({ appPath })) {
      manifest = AppProject.getComposeManifest({ appPath });
    } else {
      manifest = AppProject.getManifest({ appPath });
    }

    if (manifest.runtime === undefined) {
      // No runtime defined, means 'node' (for backwards compatibility with older apps)
      return 'node';
    }

    if (AppFactory.#recognizedRuntimes.get(manifest.runtime)) {
      // Check if recignized runtime, then return that runtime
      return manifest.runtime;
    }

    // When runtime is not recognizes, error
    throw Error(`Property "runtime" ("${manifest.runtime}") in app.json manifest is not recognized. Options: ${AppFactory.#recognizedRuntimes.keys().join(', ')}`);
  }

  /**
   * The method to create a new App project. Creating folders, files and installing dependencies
   * @param {object} config
   * @param {string} config.appPath Path to the folder where the app should be created
   */
  static async createNewAppInstance({ appPath: cwd }) {
    const stat = await statAsync(cwd);
    if (!stat.isDirectory()) {
      throw new Error('Invalid path, must be a directory');
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appName',
        message: 'What is your app\'s name?',
        default: 'My App',
        validate: input => input.length > 0,
      },
      {
        type: 'input',
        name: 'appDescription',
        message: 'What is your app\'s description?',
        default: 'Adds support for MyBrand devices.',
        validate: input => input.length > 0,
      },
      {
        type: 'input',
        name: 'id',
        message: 'What is your app\'s unique ID?',
        default: 'com.company.myapp',
        validate: input => {
          return HomeyLibApp.isValidId(input);
        },
      },
      {
        type: 'checkbox',
        name: 'platforms',
        message: 'What platforms will your app support?',
        choices: [
          { name: 'Homey Pro', value: 'local', checked: true },
          { name: 'Homey Cloud', value: 'cloud' },
        ],
      },
      {
        type: 'list',
        name: 'category',
        message: 'What is your app\'s category?',
        choices: HomeyLibApp.getCategories(),
      },
      {
        type: 'confirm',
        name: 'github-workflows',
        message: 'Use GitHub workflows to validate, update version, and publish your app?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'license',
        message: 'Use standard license for Homey Apps (GPL3)?',
        default: true,
      },
      // We ask for the 'programming language', instead of the 'runtime'.
      // This is because most people are more familiar with programming languages, than runtimes.
      // This also removes the need for an extra 'TypeScript?' question.
      {
        type: 'list',
        name: 'programming-language',
        message: 'What language do you want to use?',
        choices: [
          {
            name: 'JavaScript',
            value: 'javascript',
          },
          {
            name: 'TypeScript',
            value: 'typescript',
          },
          {
            name: 'Python',
            value: 'python',
          },
        ],
        default: 'python',
      },
    ]);

    // Create the app with own class (This will probably ask more questions)
    if (['javascript', 'typescript'].includes(answers['programming-language'])) {
      await App.create({ appPath: cwd, globalAnswers: answers });
    } else if (answers['programming-language'] === 'python') {
      await AppPython.create({ appPath: cwd, globalAnswers: answers });
    } else {
      throw new Error(`unexpected answer for programming language "${answers['programming-language']}"`);
    }
  }

}

module.exports = AppFactory;
