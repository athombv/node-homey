import fs from 'node:fs';
import path from 'node:path';
import colors from 'colors';
import { AIReviewer } from 'homey-lib';

import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';
import AppPython from '../../../lib/AppPython.js';

const DEFAULT_MODEL = 'openai/gpt-5.4';
const SUBMISSION_TYPES = ['new', 'update'];

const PROVIDER_ENV = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

const SEVERITY_STYLE = {
  blocker: (t) => colors.red.bold(t),
  warning: (t) => colors.yellow(t),
  suggestion: (t) => colors.cyan(t),
};

const VERDICT_STYLE = {
  approve: (t) => colors.green.bold(t),
  request_changes: (t) => colors.yellow.bold(t),
  reject: (t) => colors.red.bold(t),
};

export const desc = 'Run an AI review of the app against the Homey App Store guidelines';

export const builder = (yargs) => {
  return yargs
    .option('type', {
      choices: SUBMISSION_TYPES,
      default: 'new',
      description:
        'Submission type — "new" for first submission, "update" if the app is already live.',
    })
    .option('model', {
      default: DEFAULT_MODEL,
      type: 'string',
      description: `Model in "<provider>/<model>" form. Default: ${DEFAULT_MODEL}. Any other model prints a warning.`,
    })
    .option('json', {
      type: 'boolean',
      default: false,
      description: 'Emit machine-readable JSON instead of pretty terminal output.',
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      default: false,
      description:
        'Print token counts, timings, the full list of files sent, and other diagnostics.',
    })
    .epilogue(
      [
        'Data handling:',
        "  The app's source files and images are sent to the model provider you select",
        '  with --model (OpenAI or Anthropic), using your own API key. Files that may',
        '  contain credentials (.env, env.json, .npmrc, private keys) are never sent,',
        '  files ignored by .homeyignore/.gitignore are skipped, and secret-shaped',
        '  values found in the remaining source are replaced with [REDACTED:…] markers.',
        '  A summary of what will be sent is printed before the request; use --verbose',
        '  for the full file list.',
      ].join('\n'),
    );
};

export const handler = async (yargs) => {
  try {
    const appPath = path.resolve(yargs.path);
    if (!fs.existsSync(path.join(appPath, 'app.json'))) {
      throw new Error(
        `No app.json found in ${appPath}. Run this from a Homey app directory or pass --path.`,
      );
    }

    const { model } = yargs;
    const slash = model.indexOf('/');
    if (slash < 0) throw new Error(`--model must be "<provider>/<model>" (got "${model}")`);
    const provider = model.slice(0, slash);
    const envVar = PROVIDER_ENV[provider];
    if (!envVar) {
      throw new Error(
        `Unsupported provider "${provider}". Supported: ${Object.keys(PROVIDER_ENV).join(', ')}.`,
      );
    }
    if (!process.env[envVar] && !process.env.HOMEY_AI_REVIEW_DRY_RUN) {
      throw new Error(
        `${envVar} is not set. Create an API key and export it, e.g.:\n  export ${envVar}="sk-…"\n  homey app review`,
      );
    }

    // Structural rules are the validator's job: an app that fails publish
    // validation can never reach the store review, so don't spend tokens on it.
    await validateForPublish(appPath, { quiet: yargs.json });
    const manifest = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf-8'));

    if (model !== DEFAULT_MODEL && !yargs.json) {
      Log(
        colors.yellow(
          `⚠  Using "${model}" — Athom's official review uses "${DEFAULT_MODEL}". Results may differ.`,
        ),
      );
    }

    const customInstructions = readCustomInstructions(appPath);
    const images = collectImages(appPath, manifest);

    if (!yargs.json) {
      Log.info(`→ Reviewing ${manifest.id}@${manifest.version} (${yargs.type}) with ${model}`);
      Log.info(
        `→ ${images.length} images will be reviewed${customInstructions ? ', app-specific instructions loaded' : ''}`,
      );
    }

    const reviewer = new AIReviewer({ modelString: model });
    const t0 = Date.now();
    const result = await reviewer.review({
      appPath,
      manifest,
      brandColor: manifest.brandColor,
      submissionType: yargs.type,
      images,
      customInstructions,
      onExtracted: (extraction) =>
        reportExtraction(extraction, { provider, quiet: yargs.json, verbose: yargs.verbose }),
    });
    const duration = ((Date.now() - t0) / 1000).toFixed(1);

    if (yargs.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      renderResult(result, { duration, verbose: yargs.verbose });
    }

    process.exit(result.verdict === 'reject' ? 1 : 0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};

/**
 * Same check `homey app validate` does. With --json, its progress output goes
 * to stderr so stdout stays parseable.
 */
async function validateForPublish(appPath, { quiet }) {
  const consoleLog = console.log;
  if (quiet) console.log = console.error;
  try {
    const app = AppFactory.getAppInstance(appPath);
    await app.preprocess({ copyAppProductionDependencies: app instanceof AppPython });
    await app.validate({ level: 'publish' });
  } finally {
    console.log = consoleLog;
  }
}

/**
 * Printed before anything leaves the machine, so it is always visible what the
 * provider is about to receive.
 */
function reportExtraction(
  { files, excluded, redactions, totalSize },
  { provider, quiet, verbose },
) {
  if (quiet) return;

  Log.info(
    `→ ${files.length} source files (${(totalSize / 1024).toFixed(1)}KB) will be sent to ${provider}`,
  );
  if (verbose) {
    for (const file of files) Log(colors.grey(`    ${file}`));
  }

  const secrets = excluded.filter((e) => e.reason === 'secret');
  if (secrets.length > 0) {
    Log(
      colors.yellow(
        `⚠  ${secrets.length} file(s) may contain credentials and were NOT sent: ${secrets
          .map((e) => e.path)
          .join(', ')}`,
      ),
    );
  }

  if (redactions.length > 0) {
    Log(
      colors.yellow(
        `⚠  Secret-shaped values were redacted in: ${redactions.map((r) => r.path).join(', ')}`,
      ),
    );
  }
}

function readCustomInstructions(appPath) {
  const file = path.join(appPath, '.homeyreview.md');
  if (!fs.existsSync(file)) return undefined;
  const content = fs.readFileSync(file, 'utf-8').trim();
  return content || undefined;
}

function collectImages(appPath, manifest) {
  const images = [];
  const add = (label, rel) => {
    if (!rel) return;
    const abs = path.resolve(appPath, rel.replace(/^\/+/, ''));
    if (fs.existsSync(abs)) images.push({ label, source: abs });
  };

  const mImages = manifest.images || {};
  add('app imageLarge (target 500×350)', mImages.large);
  add('app imageSmall (target 250×175)', mImages.small);
  add('app imageXLarge (target 1000×700, optional)', mImages.xlarge);

  if (Array.isArray(manifest.drivers)) {
    for (const driver of manifest.drivers) {
      if (driver && driver.images && driver.images.large) {
        add(`driver "${driver.id}" imageLarge (target 500×500)`, driver.images.large);
      }
    }
  }

  if (manifest.widgets && typeof manifest.widgets === 'object') {
    for (const widgetId of Object.keys(manifest.widgets)) {
      add(`widget "${widgetId}" preview-light`, `/widgets/${widgetId}/preview-light.png`);
      add(`widget "${widgetId}" preview-dark`, `/widgets/${widgetId}/preview-dark.png`);
    }
  }

  return images;
}

function renderResult(result, { duration, verbose }) {
  const reviewFindings = result.findings.filter((f) => f.kind === 'review');
  const codeFindings = result.findings.filter((f) => f.kind === 'code');

  Log('');
  Log(colors.bold('Review findings') + colors.grey(` (${reviewFindings.length})`));
  if (reviewFindings.length === 0) {
    Log(colors.grey('  (none)'));
  } else {
    renderFindingsByCategory(reviewFindings);
  }

  if (codeFindings.length > 0) {
    Log('');
    Log(colors.bold('Code findings') + colors.grey(` (${codeFindings.length}, advisory)`));
    renderFindingsByCategory(codeFindings);
  }

  Log('');
  const verdictLabel = VERDICT_STYLE[result.verdict]
    ? VERDICT_STYLE[result.verdict](result.verdict.toUpperCase())
    : result.verdict;
  Log(`Verdict: ${verdictLabel}`);

  if (verbose) {
    const t = result.tokensUsed;
    Log('');
    Log(colors.grey(`Model: ${result.model}`));
    Log(colors.grey(`Duration: ${duration}s`));
    Log(
      colors.grey(
        `Tokens: in=${t.input} out=${t.output} cacheRead=${t.cacheRead} cacheCreate=${t.cacheCreate}`,
      ),
    );
  }
}

function renderFindingsByCategory(findings) {
  const byCategory = new Map();
  for (const f of findings) {
    if (!byCategory.has(f.category)) byCategory.set(f.category, []);
    byCategory.get(f.category).push(f);
  }
  for (const [category, items] of byCategory) {
    Log('');
    Log(colors.grey(`  [${category}]`));
    for (const f of items) {
      const style = SEVERITY_STYLE[f.severity] || ((t) => t);
      Log(`    ${style(f.severity.padEnd(10))} ${f.title}`);
      if (f.explanation)
        Log(colors.grey(`               ${wrap(f.explanation, 78, '               ')}`));
      if (f.evidence) Log(colors.grey(`               evidence: ${f.evidence}`));
      if (f.guidelineRef) Log(colors.grey(`               ref: ${f.guidelineRef}`));
    }
  }
}

function wrap(text, width, indent) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines.join(`\n${indent}`);
}
