import { renderHomeyChoicePickerRuntime } from '../choice-picker/homey-choice-picker-runtime.mjs';

export const homeyDriverCapabilitiesRuntimeHelpers = {
  async getCapabilityChoices() {
    const { default: HomeyLib } = await import('homey-lib');
    const HomeyLibDevice = HomeyLib.Device;
    const capabilities = HomeyLibDevice.getCapabilities();

    return Object.keys(capabilities)
      .sort((left, right) => {
        return capabilities[left].title.en.localeCompare(capabilities[right].title.en);
      })
      .map((capabilityId) => {
        const capability = capabilities[capabilityId];
        return {
          label: `${capability.title.en} [${capabilityId}]`,
          searchTerms: [capability.title.en, capabilityId],
          value: capabilityId,
        };
      });
  },
  async runInteractiveChoicePicker(options) {
    return renderHomeyChoicePickerRuntime(options);
  },
  async runInteractiveFlow({ app }) {
    if (!app.hasHomeyCompose()) {
      const composeResult = await homeyDriverCapabilitiesRuntimeHelpers.runInteractiveChoicePicker({
        choices: [
          {
            label: 'Use Homey Compose',
            searchTerms: ['yes migrate compose'],
            value: 'migrate',
          },
          {
            label: 'Cancel',
            searchTerms: ['no cancel'],
            value: 'cancel',
          },
        ],
        itemLabelPlural: 'Options',
        itemLabelSingular: 'Option',
        searchEnabled: false,
        submitLabel: 'continue',
        subtitle:
          'This command requires Homey Compose and will split app.json into separate files.',
        title: 'Use Homey Compose?',
      });

      if (composeResult.status !== 'submitted' || composeResult.value !== 'migrate') {
        return {
          status: 'cancelled',
        };
      }

      await app.migrateToCompose();
    }

    const driverChoices = (await app.getDrivers()).map((driverId) => {
      return {
        label: driverId,
        searchTerms: [driverId],
        value: driverId,
      };
    });

    while (true) {
      const driverResult = await homeyDriverCapabilitiesRuntimeHelpers.runInteractiveChoicePicker({
        choices: driverChoices,
        itemLabelPlural: 'Drivers',
        itemLabelSingular: 'Driver',
        subtitle: 'Choose the driver whose capabilities you want to edit.',
        title: 'Select a Driver',
      });

      if (driverResult.status !== 'submitted') {
        return {
          status: 'cancelled',
        };
      }

      const driverId = driverResult.value;
      const driverJson = await app.getDriverComposeJson(driverId);
      const capabilityResult =
        await homeyDriverCapabilitiesRuntimeHelpers.runInteractiveChoicePicker({
          allowBack: true,
          choices: await homeyDriverCapabilitiesRuntimeHelpers.getCapabilityChoices(),
          defaultValues: driverJson.capabilities ?? [],
          itemLabelPlural: 'Capabilities',
          itemLabelSingular: 'Capability',
          mode: 'multi',
          submitLabel: 'save',
          subtitle: `Editing driver: ${driverId}`,
          title: 'Driver Capabilities',
        });

      if (capabilityResult.status === 'back') {
        continue;
      }

      if (capabilityResult.status !== 'submitted') {
        return {
          status: 'cancelled',
        };
      }

      const updatedDriverJson = await app.setDriverCapabilities(driverId, capabilityResult.values);

      return {
        driver: updatedDriverJson,
        driverId,
        status: 'updated',
      };
    }
  },
};

export async function runHomeyDriverCapabilitiesRuntime({ app }) {
  return homeyDriverCapabilitiesRuntimeHelpers.runInteractiveFlow({ app });
}
