/**
 * BMF standalone shim for ReactNativeViewConfigRegistry.
 * Silently skips duplicate view registrations instead of throwing.
 * Required because Expo Go (SDK 54 / RN 0.76) pre-registers 'DebuggingOverlay'
 * natively, and the JS bundle tries to register it again → crash.
 *
 * This file is FULLY SELF-CONTAINED — it does not require the original registry.
 * Metro redirects every copy of ReactNativeViewConfigRegistry here via resolveRequest.
 */
'use strict';

const customBubblingEventTypes = {};
const customDirectEventTypes = {};

const viewConfigCallbacks = new Map();
const viewConfigs = new Map();

function processEventTypes(viewConfig) {
  const { bubblingEventTypes, directEventTypes } = viewConfig;
  if (bubblingEventTypes != null) {
    for (const t in bubblingEventTypes) {
      if (customBubblingEventTypes[t] == null) {
        customBubblingEventTypes[t] = bubblingEventTypes[t];
      }
    }
  }
  if (directEventTypes != null) {
    for (const t in directEventTypes) {
      if (customDirectEventTypes[t] == null) {
        customDirectEventTypes[t] = directEventTypes[t];
      }
    }
  }
}

function register(name, callback) {
  // BMF patch: silently skip duplicate registrations (DebuggingOverlay fix)
  if (viewConfigCallbacks.has(name)) {
    return name;
  }
  if (typeof callback !== 'function') {
    throw new Error(
      'View config getter callback for component `' + name + '` must be a function (received `' +
      (callback === null ? 'null' : typeof callback) + '`)',
    );
  }
  viewConfigCallbacks.set(name, callback);
  return name;
}

function get(name) {
  let viewConfig = viewConfigs.get(name);
  if (viewConfig == null) {
    const callback = viewConfigCallbacks.get(name);
    if (typeof callback !== 'function') {
      throw new Error(
        'View config getter callback for component `' + name + '` must be a function (received `' +
        (callback === null ? 'null' : typeof callback) + '`).' +
        (typeof name === 'string' && name.length > 0 && /[a-z]/.test(name[0])
          ? ' Make sure to start component names with a capital letter.'
          : ''),
      );
    }
    viewConfig = callback();
    if (!viewConfig) {
      throw new Error('View config not found for component `' + name + '`');
    }
    processEventTypes(viewConfig);
    viewConfigs.set(name, viewConfig);
    viewConfigCallbacks.set(name, null);
  }
  return viewConfig;
}

module.exports = {
  customBubblingEventTypes,
  customDirectEventTypes,
  register,
  get,
};
