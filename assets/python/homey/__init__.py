"""Fake module to make App-developers life easier.

This makes it possible to use 'import homey' instead of 'from homey_apps_sdk_v3 import homey'.
"""

from homey_apps_sdk_v3.homey import (
  env,
  manifest,
  SimpleClass,
  Api,
  ApiApp,
  App,
  # BleAdvertisement,         # TODO
  # BleCharacteristics,       # TODO
  # BlePeripheral,            # TODO
  # BleService,               # TODO
  # CloudOauth2Callback,      # TODO
  # CloudWebhook,             # TODO
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
  # InsightsLog,              # TODO
  LedringAnimation,
  LedringAnimationSystem,
  LedringAnimationSystemProgress,
  Manager,
  Signal,
  Signal433,
  Signal868,
  SignalInfrared,
  # ZigbeeNode,               # TODO
  # ZwaveCommandClass,        # TODO
  # ZwaveNode,                # TODO
)

__all__ = [
  "manifest",
  "env",
  "SimpleClass",
  "Api",
  "ApiApp",
  "App",
  # "BleAdvertisement",         # TODO
  # "BleCharacteristics",       # TODO
  # "BlePeripheral",            # TODO
  # "BleService",               # TODO
  # "CloudOauth2Callback",      # TODO
  # "CloudWebhook",             # TODO
  "Device",
  "DiscoveryResult",
  "DiscoveryResultMAC",
  "DiscoveryResultMDNSSD",
  "DiscoveryResultSSDP",
  "DiscoveryStrategy",
  "Driver",
  "FlowArgument",
  "FlowCard",
  "FlowCardAction",
  "FlowCardCondition",
  "FlowCardTrigger",
  "FlowCardTriggerDevice",
  "FlowToken",
  "Image",
  # "InsightsLog",              # TODO
  "LedringAnimation",
  "LedringAnimationSystem",
  "LedringAnimationSystemProgress",
  "Manager",
  "Signal",
  "Signal433",
  "Signal868",
  "SignalInfrared",
  # "ZigbeeNode",               # TODO
  # "ZwaveCommandClass",        # TODO
  # "ZwaveNode",                # TODO
]