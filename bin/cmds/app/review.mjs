import fs from 'node:fs';
import path from 'node:path';
import colors from 'colors';
import { AIReviewer } from 'homey-lib';

import Log from '../../../lib/Log.js';

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
      description: 'Print token counts, timings, and other diagnostics.',
    });
};

export const handler = async (yargs) => {
  try {
    const appPath = path.resolve(yargs.path);
    if (!fs.existsSync(path.join(appPath, 'app.json'))) {
      throw new Error(
        `No app.json found in ${appPath}. Run this from a Homey app directory or pass --path.`,
      );
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(appPath, 'app.json'), 'utf-8'));

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
    if (!process.env[envVar]) {
      throw new Error(
        `${envVar} is not set. Create an API key and export it, e.g.:\n  export ${envVar}="sk-…"\n  homey app review`,
      );
    }

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
      appId: manifest.id,
      brandColor: manifest.brandColor,
      submissionType: yargs.type,
      images,
      customInstructions,
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
