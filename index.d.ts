import SimpleClass from './sdk/lib/SimpleClass';
import Api from './sdk/lib/Api';
import ApiApp from './sdk/lib/ApiApp';
import App from './sdk/lib/App';
import BleAdvertisement from './sdk/lib/BleAdvertisement';
import BleCharacteristic from './sdk/lib/BleCharacteristic';
import BleDescriptor from './sdk/lib/BleDescriptor';
import BlePeripheral from './sdk/lib/BlePeripheral';
import BleService from './sdk/lib/BleService';
import CloudOAuth2Callback from './sdk/lib/CloudOAuth2Callback';
import CloudWebhook from './sdk/lib/CloudWebhook';
import CronTask from './sdk/lib/CronTask';
import Device from './sdk/lib/Device';
import DiscoveryResult from './sdk/lib/DiscoveryResult';
import DiscoveryResultMAC from './sdk/lib/DiscoveryResultMAC';
import DiscoveryResultMDNSSD from './sdk/lib/DiscoveryResultMDNSSD';
import DiscoveryResultSSDP from './sdk/lib/DiscoveryResultSSDP';
import DiscoveryStrategy from './sdk/lib/DiscoveryStrategy';
import Driver from './sdk/lib/Driver';
import FlowArgument from './sdk/lib/FlowArgument';
import FlowCard from './sdk/lib/FlowCard';
import FlowCardAction from './sdk/lib/FlowCardAction';
import FlowCardCondition from './sdk/lib/FlowCardCondition';
import FlowCardTrigger from './sdk/lib/FlowCardTrigger';
import FlowCardTriggerDevice from './sdk/lib/FlowCardTriggerDevice';
import FlowToken from './sdk/lib/FlowToken';
import Image from './sdk/lib/Image';
import InsightsLog from './sdk/lib/InsightsLog';
import LedringAnimation from './sdk/lib/LedringAnimation';
import LedringAnimationSystem from './sdk/lib/LedringAnimationSystem';
import LedringAnimationSystemProgress from './sdk/lib/LedringAnimationSystemProgress';
import Manager from './sdk/lib/Manager';
import Notification from './sdk/lib/Notification';
import Signal from './sdk/lib/Signal';
import Signal433 from './sdk/lib/Signal433';
import Signal868 from './sdk/lib/Signal868';
import SignalInfrared from './sdk/lib/SignalInfrared';
import ZigBeeNode from './sdk/lib/ZigBeeNode';
import ZigBeeEndpoint from './sdk/lib/ZigBeeEndpoint';
import ZigBeeCluster from './sdk/lib/ZigBeeCluster';
import ZwaveCommandClass from './sdk/lib/ZwaveCommandClass';
import ZwaveNode from './sdk/lib/ZwaveNode';

import ManagerApiClass from './sdk/manager/api';
import ManagerAppsClass from './sdk/manager/apps';
import ManagerArpClass from './sdk/manager/arp';
import ManagerAudioClass from './sdk/manager/audio';
import ManagerBLEClass from './sdk/manager/ble';
import ManagerClockClass from './sdk/manager/clock';
import ManagerCloudClass from './sdk/manager/cloud';
import ManagerCronClass from './sdk/manager/cron';
import ManagerDiscoveryClass from './sdk/manager/discovery';
import ManagerDriversClass from './sdk/manager/drivers';
import ManagerFlowClass from './sdk/manager/flow';
import ManagerGeolocationClass from './sdk/manager/geolocation';
import ManagerI18nClass from './sdk/manager/i18n';
import ManagerImagesClass from './sdk/manager/images';
import ManagerInsightsClass from './sdk/manager/insights';
import ManagerLedringClass from './sdk/manager/ledring';
import ManagerNFCClass from './sdk/manager/nfc';
import ManagerNotificationsClass from './sdk/manager/notifications';
import ManagerRFClass from './sdk/manager/rf';
import ManagerSettingsClass from './sdk/manager/settings';
import ManagerSpeechInputClass from './sdk/manager/speech-input';
import ManagerSpeechOutputClass from './sdk/manager/speech-output';
import ManagerZigBeeClass from './sdk/manager/zigbee';
import ManagerZwaveClass from './sdk/manager/zwave';

declare const app: any;
declare const env: any;
declare function __(key: string, properties?: any): string;
declare const version: string;

declare const ManagerApi: ManagerApiClass;
declare const ManagerApps: ManagerAppsClass;
declare const ManagerArp: ManagerArpClass;
declare const ManagerAudio: ManagerAudioClass;
declare const ManagerBLE: ManagerBLEClass;
declare const ManagerClock: ManagerClockClass;
declare const ManagerCloud: ManagerCloudClass;
declare const ManagerCron: ManagerCronClass;
declare const ManagerDiscovery: ManagerDiscoveryClass;
declare const ManagerDrivers: ManagerDriversClass;
declare const ManagerFlow: ManagerFlowClass;
declare const ManagerGeolocation: ManagerGeolocationClass;
declare const ManagerI18n: ManagerI18nClass;
declare const ManagerImages: ManagerImagesClass;
declare const ManagerInsights: ManagerInsightsClass;
declare const ManagerLedring: ManagerLedringClass;
declare const ManagerNFC: ManagerNFCClass;
declare const ManagerNotifications: ManagerNotificationsClass;
declare const ManagerRF: ManagerRFClass;
declare const ManagerSettings: ManagerSettingsClass;
declare const ManagerSpeechInput: ManagerSpeechInputClass;
declare const ManagerSpeechOutput: ManagerSpeechOutputClass;
declare const ManagerZigBee: ManagerZigBeeClass;
declare const ManagerZwave: ManagerZwaveClass;

export {
  // Properties
  version,
  __,
  env,
  app,
  // Objects
  SimpleClass,
  Api,
  ApiApp,
  App,
  BleAdvertisement,
  BleCharacteristic,
  BleDescriptor,
  BlePeripheral,
  BleService,
  CloudOAuth2Callback,
  CloudWebhook,
  CronTask,
  Device,
  DiscoveryResult,
  DiscoveryResultMAC,
  DiscoveryResultMDNSSD,
  DiscoveryResultSSDP,
  DiscoveryStrategy,
  Driver,
  FlowArgument,
  FlowCard,
  FlowCardAction,
  FlowCardCondition,
  FlowCardTrigger,
  FlowCardTriggerDevice,
  FlowToken,
  Image,
  InsightsLog,
  LedringAnimation,
  LedringAnimationSystem,
  LedringAnimationSystemProgress,
  Manager,
  Notification,
  Signal,
  Signal433,
  Signal868,
  SignalInfrared,
  ZigBeeNode,
  ZigBeeEndpoint,
  ZigBeeCluster,
  ZwaveCommandClass,
  ZwaveNode,
  // Managers
  ManagerApi,
  ManagerApps,
  ManagerArp,
  ManagerAudio,
  ManagerBLE,
  ManagerClock,
  ManagerCloud,
  ManagerCron,
  ManagerDiscovery,
  ManagerDrivers,
  ManagerFlow,
  ManagerGeolocation,
  ManagerI18n,
  ManagerImages,
  ManagerInsights,
  ManagerLedring,
  ManagerNFC,
  ManagerNotifications,
  ManagerRF,
  ManagerSettings,
  ManagerSpeechInput,
  ManagerSpeechOutput,
  ManagerZigBee,
  ManagerZwave,
};
