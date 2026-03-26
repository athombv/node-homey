import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import App from '../../lib/App.js';
import AppFactory from '../../lib/AppFactory.js';
import AppPython from '../../lib/AppPython.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AppFactory create helpers', () => {
  it('injects confirmation for collected node answers', async () => {
    let createArgs;

    mock.method(App, 'create', async (args) => {
      createArgs = args;
    });

    await AppFactory.createNewAppInstanceFromAnswers({
      answers: {
        appDescription: 'Adds support for MyBrand devices.',
        appName: 'My App',
        category: 'tools',
        eslint: true,
        'github-workflows': false,
        id: 'com.company.myapp',
        license: true,
        platforms: ['local'],
        'programming-language': 'javascript',
      },
      appPath: '/tmp/apps',
    });

    assert.deepStrictEqual(createArgs.localAnswers, {
      confirm: true,
      eslint: true,
      'github-workflows': false,
    });
  });

  it('injects confirmation for collected python answers', async () => {
    let createArgs;

    mock.method(AppPython, 'create', async (args) => {
      createArgs = args;
    });

    await AppFactory.createNewAppInstanceFromAnswers({
      answers: {
        appDescription: 'Adds support for MyBrand devices.',
        appName: 'My App',
        category: 'tools',
        id: 'com.company.myapp',
        license: true,
        platforms: ['local'],
        'programming-language': 'python',
      },
      appPath: '/tmp/apps',
    });

    assert.deepStrictEqual(createArgs.localAnswers, {
      confirm: true,
    });
  });
});
