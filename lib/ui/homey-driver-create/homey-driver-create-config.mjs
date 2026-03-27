function validateRequiredText(value, message = 'This field is required') {
  if (!String(value ?? '').trim()) {
    return message;
  }

  return true;
}

function validateMatterVendorId(input) {
  const value = Number(input);

  if (Number.isNaN(value)) {
    return 'Vendor ID must be a number';
  }

  if (value < 0x0001 || value > 0xfff0) {
    return 'Vendor ID must be between 0x0001 (1) and 0xfff0 (65520)';
  }

  return true;
}

function validateMatterProductId(input) {
  const value = Number(input);

  if (Number.isNaN(value)) {
    return 'Product ID must be a number';
  }

  if (value < 0x0001 || value > 0xffff) {
    return 'Product ID must be between 0x0001 (1) and 0xffff (65535)';
  }

  return true;
}

function validateProductName(input) {
  if (!String(input ?? '').trim()) {
    return 'Product name cannot be empty';
  }

  if (String(input).length > 32) {
    return 'Product name cannot be longer than 32 characters';
  }

  return true;
}

function validateZWaveInteger(input, label) {
  if (!String(input ?? '').trim()) {
    return `${label} is required`;
  }

  if (Number.isNaN(Number.parseInt(String(input), 10))) {
    return `${label} must be a number`;
  }

  return true;
}

function validateZWaveIntegerList(input, label) {
  const normalizedValue = String(input ?? '').trim();

  if (!normalizedValue) {
    return `${label} is required`;
  }

  const parsedValues = normalizedValue
    .split(',')
    .map((entry) => {
      return entry.trim();
    })
    .filter(Boolean)
    .map((entry) => {
      return Number.parseInt(entry, 10);
    });

  if (parsedValues.length === 0 || parsedValues.some((entry) => Number.isNaN(entry))) {
    return `${label} must be a comma-separated list of numbers`;
  }

  return true;
}

export async function getDriverCreateCapabilityChoices() {
  const { default: HomeyLib } = await import('homey-lib');
  const capabilities = HomeyLib.Device.getCapabilities();

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
}

export async function getDriverCreateClassChoices() {
  const { default: HomeyLib } = await import('homey-lib');
  const classes = HomeyLib.Device.getClasses();

  return Object.keys(classes)
    .sort((left, right) => {
      return classes[left].title.en.localeCompare(classes[right].title.en);
    })
    .map((classId) => {
      const driverClass = classes[classId];
      return {
        label: `${driverClass.title.en} [${classId}]`,
        searchTerms: [driverClass.title.en, classId],
        value: classId,
      };
    });
}

export function buildDriverCreateConfig(answers = {}) {
  const config = {
    createDiscovery: Boolean(answers.createDiscovery),
    driverCapabilities: answers.driverCapabilities ?? [],
    driverClass: answers.driverClass,
    driverId: answers.driverId,
    driverName: answers.driverName,
    shouldInstallOAuth2App: Boolean(answers.shouldInstallOAuth2App),
    shouldInstallRFDriver: Boolean(answers.shouldInstallRFDriver),
    shouldInstallZigbeeDriver: Boolean(answers.shouldInstallZigbeeDriver),
    shouldInstallZwaveDriver: Boolean(answers.shouldInstallZwaveDriver),
    shouldMigrateCompose: Boolean(answers.shouldMigrateCompose),
    wirelessType: answers.wirelessType,
  };

  if (answers.createDiscovery) {
    config.discoveryStrategy = {
      identifier: answers.discoveryIdentifier,
      macAddresses: answers.discoveryMacAddresses,
      name: answers.discoveryMdnsName,
      protocol: answers.discoveryMdnsProtocol,
      search: answers.discoverySearch,
      title: answers.discoveryStrategyTitle,
      type: answers.discoveryStrategyType,
    };
  }

  if (answers.wirelessType === 'matter') {
    config.deviceProductName = answers.deviceProductName;
    config.deviceVendorId = answers.deviceVendorId;
    config.isBridgedDevice = Boolean(answers.isBridgedDevice);
    config.productId = answers.matterProductId;
    config.vendorId = answers.matterVendorId;
  }

  if (answers.wirelessType === 'zwave') {
    config.exclusionDescription = answers.zwaveExclusionDescription;
    config.inclusionDescription = answers.zwaveInclusionDescription;
    config.manufacturerId = answers.zwaveManufacturerId;
    config.productId = answers.zwaveProductId;
    config.productTypeId = answers.zwaveProductTypeId;
    config.sigmaAllianceProductDocumentation = answers.zwaveAllianceProductDocumentation;
    config.sigmaAllianceProductId = answers.zwaveAllianceProductId;
  }

  return config;
}

export async function getDriverCreateQuestionDefinitions({ app }) {
  const [driverClassChoices, capabilityChoices] = await Promise.all([
    getDriverCreateClassChoices(),
    getDriverCreateCapabilityChoices(),
  ]);
  const questionDefinitions = [];

  if (!app.hasHomeyCompose()) {
    questionDefinitions.push({
      default: true,
      message:
        'Do you want to use Homey compose? It will split the app.json file into separate files for Drivers, Flow Cards and Discovery Strategies.',
      name: 'shouldMigrateCompose',
      reviewLabel: 'Use Homey Compose',
      reviewSection: 'Setup',
      type: 'confirm',
      validate(value) {
        return value || 'This command requires Homey compose.';
      },
    });
  }

  questionDefinitions.push(
    {
      message: "What is your Driver's Name?",
      name: 'driverName',
      reviewLabel: 'Name',
      reviewSection: 'Driver',
      type: 'input',
      validate(value) {
        return validateRequiredText(value, 'Driver name cannot be empty');
      },
    },
    {
      default(answers) {
        return app.getDefaultDriverId(answers.driverName);
      },
      message: "What is your Driver's ID?",
      name: 'driverId',
      reviewLabel: 'ID',
      reviewSection: 'Driver',
      type: 'input',
      validate(value) {
        return app.validateNewDriverId(value);
      },
    },
    {
      choices: driverClassChoices,
      message: "What is your Driver's Device Class?",
      name: 'driverClass',
      reviewLabel: 'Device class',
      reviewSection: 'Driver',
      searchable: true,
      type: 'searchable-list',
    },
    {
      choices: capabilityChoices,
      message: "What are your Driver's Capabilities?",
      name: 'driverCapabilities',
      reviewLabel: 'Capabilities',
      reviewSection: 'Driver',
      searchable: true,
      type: 'searchable-checkbox',
    },
    {
      choices: [
        { label: 'Other', value: 'other' },
        { label: 'LAN', value: 'lan' },
        { label: 'OAuth2', value: 'oauth2' },
        { label: 'Bluetooth Low Energy', value: 'ble' },
        { label: 'Infrared', value: 'infrared' },
        { label: '433 Mhz', value: 'rf433' },
        { label: '868 Mhz', value: 'rf868' },
        { label: 'Zigbee', value: 'zigbee' },
        { label: 'Z-Wave', value: 'zwave' },
        { label: 'Matter', value: 'matter' },
      ],
      message: 'What type of device is this?',
      name: 'wirelessType',
      reviewLabel: 'Device type',
      reviewSection: 'Connectivity',
      type: 'list',
    },
    {
      default: true,
      isApplicable(answers) {
        return ['infrared', 'rf433', 'rf868'].includes(answers.wirelessType);
      },
      message: 'Do you want to install homey-rfdriver?',
      name: 'shouldInstallRFDriver',
      reviewLabel: 'Install homey-rfdriver',
      reviewSection: 'Libraries',
      type: 'confirm',
    },
    {
      default: true,
      isApplicable(answers) {
        return answers.wirelessType === 'zigbee';
      },
      message: 'Do you want to install homey-zigbeedriver?',
      name: 'shouldInstallZigbeeDriver',
      reviewLabel: 'Install homey-zigbeedriver',
      reviewSection: 'Libraries',
      type: 'confirm',
    },
    {
      default: true,
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'Do you want to install homey-zwavedriver?',
      name: 'shouldInstallZwaveDriver',
      reviewLabel: 'Install homey-zwavedriver',
      reviewSection: 'Libraries',
      type: 'confirm',
    },
    {
      default: true,
      isApplicable(answers) {
        return answers.wirelessType === 'oauth2';
      },
      message: 'Do you want to install homey-oauth2app?',
      name: 'shouldInstallOAuth2App',
      reviewLabel: 'Install homey-oauth2app',
      reviewSection: 'Libraries',
      type: 'confirm',
    },
    {
      default: false,
      isApplicable(answers) {
        return answers.wirelessType === 'lan';
      },
      message:
        'Do you want to create a Discovery strategy to find your device automatically in the LAN?',
      name: 'createDiscovery',
      reviewLabel: 'Create discovery strategy',
      reviewSection: 'Discovery',
      type: 'confirm',
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'lan' && answers.createDiscovery;
      },
      message: 'What is your Discovery strategy ID?',
      name: 'discoveryStrategyTitle',
      reviewLabel: 'Strategy ID',
      reviewSection: 'Discovery',
      type: 'input',
      validate(value) {
        return app.validateDiscoveryStrategyId(value);
      },
    },
    {
      choices: [
        { label: 'mDNS-SD', value: 'mdns-sd' },
        { label: 'SSDP', value: 'ssdp' },
        { label: 'MAC Address range', value: 'mac' },
      ],
      isApplicable(answers) {
        return answers.wirelessType === 'lan' && answers.createDiscovery;
      },
      message: 'What is the type of your Discovery strategy?',
      name: 'discoveryStrategyType',
      reviewLabel: 'Strategy type',
      reviewSection: 'Discovery',
      type: 'list',
    },
    {
      isApplicable(answers) {
        return (
          answers.wirelessType === 'lan' &&
          answers.createDiscovery &&
          answers.discoveryStrategyType === 'mdns-sd'
        );
      },
      message: 'What is the name of the mDNS query?',
      name: 'discoveryMdnsName',
      reviewLabel: 'mDNS query name',
      reviewSection: 'Discovery',
      type: 'input',
      validate(value) {
        return validateRequiredText(value, 'mDNS query name cannot be empty');
      },
    },
    {
      choices: [
        { label: 'tcp', value: 'tcp' },
        { label: 'udp', value: 'udp' },
      ],
      isApplicable(answers) {
        return (
          answers.wirelessType === 'lan' &&
          answers.createDiscovery &&
          answers.discoveryStrategyType === 'mdns-sd'
        );
      },
      message: 'What is the protocol of your mDNS query?',
      name: 'discoveryMdnsProtocol',
      reviewLabel: 'mDNS protocol',
      reviewSection: 'Discovery',
      type: 'list',
    },
    {
      isApplicable(answers) {
        return (
          answers.wirelessType === 'lan' &&
          answers.createDiscovery &&
          ['mdns-sd', 'ssdp'].includes(answers.discoveryStrategyType)
        );
      },
      message: 'What is the identifier to identify the device?',
      name: 'discoveryIdentifier',
      reviewLabel: 'Identifier',
      reviewSection: 'Discovery',
      type: 'input',
      validate(value) {
        return validateRequiredText(value, 'Identifier cannot be empty');
      },
    },
    {
      isApplicable(answers) {
        return (
          answers.wirelessType === 'lan' &&
          answers.createDiscovery &&
          answers.discoveryStrategyType === 'ssdp'
        );
      },
      message: 'What is the search scheme?',
      name: 'discoverySearch',
      reviewLabel: 'Search scheme',
      reviewSection: 'Discovery',
      type: 'input',
      validate(value) {
        return validateRequiredText(value, 'Search scheme cannot be empty');
      },
    },
    {
      isApplicable(answers) {
        return (
          answers.wirelessType === 'lan' &&
          answers.createDiscovery &&
          answers.discoveryStrategyType === 'mac'
        );
      },
      message: 'Enter one or more full MAC addresses or prefixes separated by commas or new lines.',
      name: 'discoveryMacAddresses',
      placeholder: 'AA:BB:CC:DD:EE:FF, AA:BB:CC',
      reviewLabel: 'MAC addresses',
      reviewSection: 'Discovery',
      type: 'input',
      validate(value) {
        app.parseDiscoveryMacAddresses(value);
        return true;
      },
    },
    {
      default: false,
      isApplicable(answers) {
        return answers.wirelessType === 'matter';
      },
      message: 'Is this a Matter device connected through a Matter bridge?',
      name: 'isBridgedDevice',
      reviewLabel: 'Bridged Matter device',
      reviewSection: 'Matter',
      type: 'confirm',
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'matter' && answers.isBridgedDevice;
      },
      message: 'What is the Vendor ID of the bridged Matter device?',
      name: 'deviceVendorId',
      reviewLabel: 'Bridged device vendor ID',
      reviewSection: 'Matter',
      type: 'input',
      validate: validateMatterVendorId,
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'matter' && answers.isBridgedDevice;
      },
      message: 'What is the product name of the bridged Matter device?',
      name: 'deviceProductName',
      reviewLabel: 'Bridged device product name',
      reviewSection: 'Matter',
      type: 'input',
      validate: validateProductName,
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'matter';
      },
      message: 'What is the Vendor ID of the Matter device or bridge?',
      name: 'matterVendorId',
      reviewLabel: 'Vendor ID',
      reviewSection: 'Matter',
      type: 'input',
      validate: validateMatterVendorId,
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'matter';
      },
      message: 'What is the Product ID of the Matter device or bridge?',
      name: 'matterProductId',
      reviewLabel: 'Product ID',
      reviewSection: 'Matter',
      type: 'input',
      validate: validateMatterProductId,
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'What is the Manufacturer ID (in decimal)?',
      name: 'zwaveManufacturerId',
      reviewLabel: 'Manufacturer ID',
      reviewSection: 'Z-Wave',
      type: 'input',
      validate(value) {
        return validateZWaveInteger(value, 'Manufacturer ID');
      },
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'What is the Product Type ID (in decimal)? If multiple, separate by comma.',
      name: 'zwaveProductTypeId',
      reviewLabel: 'Product Type ID',
      reviewSection: 'Z-Wave',
      type: 'input',
      validate(value) {
        return validateZWaveIntegerList(value, 'Product Type ID');
      },
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'What is the Product ID (in decimal)? If multiple, separate by comma.',
      name: 'zwaveProductId',
      reviewLabel: 'Product ID',
      reviewSection: 'Z-Wave',
      type: 'input',
      validate(value) {
        return validateZWaveIntegerList(value, 'Product ID');
      },
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'What is the Z-Wave Alliance Product ID? Leave empty if unknown.',
      name: 'zwaveAllianceProductId',
      reviewLabel: 'Alliance Product ID',
      reviewSection: 'Z-Wave',
      shouldReview(value) {
        return Boolean(value);
      },
      type: 'input',
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'What is the Z-Wave Alliance Product Documentation URL? Leave empty if unknown.',
      name: 'zwaveAllianceProductDocumentation',
      reviewLabel: 'Alliance documentation URL',
      reviewSection: 'Z-Wave',
      shouldReview(value) {
        return Boolean(value);
      },
      type: 'input',
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'Enter a short description on how to enable inclusion mode. Leave empty if unknown.',
      name: 'zwaveInclusionDescription',
      reviewLabel: 'Inclusion mode',
      reviewSection: 'Z-Wave',
      shouldReview(value) {
        return Boolean(value);
      },
      type: 'input',
    },
    {
      isApplicable(answers) {
        return answers.wirelessType === 'zwave';
      },
      message: 'Enter a short description on how to enable exclusion mode. Leave empty if unknown.',
      name: 'zwaveExclusionDescription',
      reviewLabel: 'Exclusion mode',
      reviewSection: 'Z-Wave',
      shouldReview(value) {
        return Boolean(value);
      },
      type: 'input',
    },
  );

  return questionDefinitions;
}

export async function runHomeyDriverCreateWizard({ app, title = 'Create a Driver' }) {
  const questionDefinitions = await getDriverCreateQuestionDefinitions({ app });
  const { renderHomeyDriverCreateRuntime } = await import('./homey-driver-create-runtime.mjs');

  return renderHomeyDriverCreateRuntime({
    questionDefinitions,
    title,
  });
}
