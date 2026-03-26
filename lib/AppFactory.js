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

const App = require('./App');
const AppPython = require('./AppPython');

const statAsync = promisify(fs.stat);

const recognizedRuntimes = new Map([
  ['nodejs', App],
  ['python', AppPython],
]);

const APP_CREATE_GLOBAL_QUESTIONS = [
  {
    type: 'input',
    name: 'appName',
    message: "What is your app's name?",
    default: 'My App',
    validate: (input) => input.length > 0,
  },
  {
    type: 'input',
    name: 'appDescription',
    message: "What is your app's description?",
    default: 'Adds support for MyBrand devices.',
    validate: (input) => input.length > 0,
  },
  {
    type: 'input',
    name: 'id',
    message: "What is your app's unique ID?",
    default: 'com.company.myapp',
    validate: (input) => {
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
    message: "What is your app's category?",
    choices: HomeyLibApp.getCategories(),
  },
  {
    type: 'confirm',
    name: 'license',
    message: 'Use standard license for Homey Apps (GPL3)?',
    default: true,
  },
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
    default: 'javascript',
  },
];

function cloneQuestion(question) {
  return {
    ...question,
    choices: Array.isArray(question.choices)
      ? question.choices.map((choice) => {
          return typeof choice === 'object' ? { ...choice } : choice;
        })
      : question.choices,
  };
}

function cloneQuestions(questions = []) {
  return questions.map(cloneQuestion);
}

function pickAnswers(source = {}, questions = []) {
  return questions.reduce((result, question) => {
    if (Object.prototype.hasOwnProperty.call(source, question.name)) {
      result[question.name] = source[question.name];
    }

    return result;
  }, {});
}

class AppFactory {
  /**
   * Get the App class for the runtime of the current project
   * @param {string} appPath Path to root-folder of the App
   * @returns {App | AppPython} The app instance
   */
  static getAppInstance(appPath) {
    const manifest = App.getManifest({ appPath });
    const runtime = manifest.runtime ?? 'nodejs';
    const AppClass = recognizedRuntimes.get(runtime);
    if (AppClass === undefined) {
      throw Error(
        `The app.json property \`runtime\` must be one of [${[...recognizedRuntimes.keys()].join(', ')}]`,
      );
    }
    return new AppClass(appPath);
  }

  static getCreateNewAppQuestions() {
    return cloneQuestions(APP_CREATE_GLOBAL_QUESTIONS);
  }

  static getCreateNewAppQuestionGroups() {
    return {
      globalQuestions: this.getCreateNewAppQuestions(),
      nodeQuestions: App.getCreateQuestions(),
      pythonQuestions: AppPython.getCreateQuestions(),
    };
  }

  static async promptCreateNewAppAnswers() {
    const globalAnswers = await inquirer.prompt(this.getCreateNewAppQuestions());

    if (globalAnswers['programming-language'] === 'python') {
      const localAnswers = await inquirer.prompt([
        ...AppPython.getCreateQuestions(),
        AppPython.getCreateConfirmationQuestion(),
      ]);

      return {
        ...globalAnswers,
        ...localAnswers,
      };
    }

    const localAnswers = await inquirer.prompt([
      ...App.getCreateQuestions(),
      App.getCreateConfirmationQuestion(),
    ]);

    return {
      ...globalAnswers,
      ...localAnswers,
    };
  }

  static async createNewAppInstanceFromAnswers({ appPath: cwd, answers }) {
    const globalAnswers = pickAnswers(answers, APP_CREATE_GLOBAL_QUESTIONS);

    if (answers['programming-language'] === 'python') {
      await AppPython.create({
        appPath: cwd,
        globalAnswers,
        localAnswers: pickAnswers(answers, [
          ...AppPython.getCreateQuestions(),
          AppPython.getCreateConfirmationQuestion(),
        ]),
      });

      return;
    }

    await App.create({
      appPath: cwd,
      globalAnswers,
      localAnswers: pickAnswers(answers, [
        ...App.getCreateQuestions(),
        App.getCreateConfirmationQuestion(),
      ]),
    });
  }

  /**
   * The method to create a new App project. Creating folders, files and installing dependencies
   * @param {object} config
   * @param {string} config.appPath Path to the folder where the app should be created
   * @param {object} [config.answers] Optional pre-collected answers
   */
  static async createNewAppInstance({ appPath: cwd, answers: providedAnswers }) {
    const stat = await statAsync(cwd);
    if (!stat.isDirectory()) {
      throw new Error('Invalid path, must be a directory');
    }

    const answers = providedAnswers ?? (await this.promptCreateNewAppAnswers());
    await this.createNewAppInstanceFromAnswers({
      appPath: cwd,
      answers,
    });
  }
}

module.exports = AppFactory;
