import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import { refreshContextTargetMetadata } from '../../../lib/ContextOperations.mjs';
import Log from '../../../lib/Log.js';
import {
  createHomeyApiClient,
  disposeHomeyApiClient,
} from '../../../lib/api/ApiCommandRuntime.mjs';

export const command = 'diagnose <name>';
export const desc = 'Check whether a Homey context can connect';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('name', { type: 'string', description: 'Context name' })
    .option('refresh', {
      type: 'boolean',
      default: false,
      description: 'Refresh cached target metadata when account access is available',
    });
};

export async function diagnoseContext(name, argv = {}) {
  const startedAt = Date.now();
  const api = await createHomeyApiClient({
    context: name,
    auth: argv.auth ?? 'auto',
  });

  try {
    const effectiveContext = api.__homeyCliEffectiveContext;
    await api.call({
      method: 'GET',
      path: '/api/manager/system/',
      $timeout: 10000,
    });

    return {
      name,
      status: 'ready',
      durationMs: Date.now() - startedAt,
      target: {
        homeyId: api.id ?? effectiveContext?.target.homeyId ?? null,
        name: api.name ?? effectiveContext?.target.name ?? null,
        platform: api.platform ?? effectiveContext?.target.platform ?? null,
      },
      authentication: effectiveContext?.authentication.mode ?? null,
      route: effectiveContext?.route ?? null,
      resolvedStrategy: api.strategyId ?? api.__strategyId ?? null,
      baseUrl: (await api.baseUrl) ?? null,
    };
  } finally {
    await disposeHomeyApiClient(api);
  }
}

export const handler = async (argv) => {
  try {
    if (argv.refresh) {
      await refreshContextTargetMetadata(argv.name);
    }

    const report = await diagnoseContext(argv.name, argv);

    printStructuredOutput({
      value: report,
      argv,
      printHuman: () => {
        Log.success(`Context ${argv.name} connected in ${report.durationMs}ms.`);
        Log(`Authentication: ${report.authentication}`);
        Log(`Base URL: ${report.baseUrl ?? '-'}`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
