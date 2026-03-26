import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { HOMEY_UI_THEME } from '../../lib/ui/theme.mjs';

export const desc = 'Select a Homey as active';
export function builder(yargs) {
  return yargs
    .commandDir('select', {
      extensions: ['.mjs'],
    })
    .option('id', {
      alias: 'i',
      desc: 'ID of the Homey',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      desc: 'Name of the Homey',
      type: 'string',
    })
    .example('$0 select', 'Select a Homey interactively')
    .example('$0 select --id <HOMEY_ID>', 'Select a Homey by id')
    .example('$0 select current --json', 'Show the currently selected Homey as JSON')
    .help();
}

function ensureInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export const SelectCommandHelpers = {
  async runInteractiveSelection(options) {
    const { renderHomeySelectRuntime } =
      await import('../../lib/ui/homey-select/homey-select-runtime.mjs');

    return renderHomeySelectRuntime(options);
  },
};

function colorizeWithHex(text, hexColor, output = process.stdout) {
  if (!output?.isTTY || process.env.NO_COLOR) {
    return text;
  }

  if (typeof hexColor !== 'string') {
    return text;
  }

  const normalizedHexColor = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalizedHexColor)) {
    return text;
  }

  const red = Number.parseInt(normalizedHexColor.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHexColor.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHexColor.slice(4, 6), 16);

  return `\u001B[1m\u001B[38;2;${red};${green};${blue}m${text}\u001B[39m\u001B[22m`;
}

export function formatSelectedHomeyName(name, output = process.stdout) {
  return colorizeWithHex(name, HOMEY_UI_THEME.highlight, output);
}

export async function handler(argv) {
  try {
    if (argv.id || argv.name) {
      await AthomApi.selectActiveHomey({
        id: argv.id,
        name: argv.name,
      });
      process.exit(0);
      return;
    }

    if (!ensureInteractiveTerminal()) {
      Log.error(
        'Interactive selection requires a TTY. Use `homey select --id <HOMEY_ID>` or `homey select --name <HOMEY_NAME>`.',
      );
      process.exit(1);
      return;
    }

    const result = await SelectCommandHelpers.runInteractiveSelection({
      loadData: async () => {
        const [homeys, activeHomey] = await Promise.all([
          AthomApi.getHomeys({
            local: false,
          }),
          AthomApi.getSelectedHomey(),
        ]);

        return {
          activeHomey,
          homeys,
        };
      },
      title: 'Select a Homey',
    });

    if (result.status === 'cancelled') {
      Log.warning('Selection cancelled.');
      process.exit(1);
      return;
    }

    if (result.status === 'error') {
      throw result.error;
    }

    await AthomApi.setActiveHomey({
      id: result.homey.id,
      name: result.homey.name,
      platform: result.homey.platform,
    });

    Log(`You have selected ${formatSelectedHomeyName(result.homey.name)} as your active Homey.`);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
}
